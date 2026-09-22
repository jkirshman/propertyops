import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import {
  canAccessProperty,
  canUserAccessPropertyUnit,
  forbiddenResponseBody,
  listAccessiblePropertyIds,
  resolveUserPropertyScope,
} from "@/lib/auth/property-access";
import { redactHiddenEquipmentLink, resolveHiddenEquipmentIds } from "@/lib/equipment/equipment-access";
import { getAccessiblePropertyEquipment } from "@/lib/equipment/property-equipment";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { filterAccessibleInspections } from "@/lib/inspections/inspection-access";
import { createInspection, listInspections } from "@/lib/inspections/inspections";
import { buildInspectionScheduledNotification } from "@/lib/inspections/notification-events";
import { createNotification } from "@/lib/notifications/notifications";
import { getProperty } from "@/lib/properties/properties";
import { resolveRecordUnit } from "@/lib/property-units/record-units";
import { createInspectionSchema } from "@/lib/validation/inspections";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(INSPECTION_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );

  const { searchParams } = new URL(request.url);
  // UNIT-EQUIP-1: filtering by hidden Equipment answers "none" (fail closed).
  const propertyEquipmentId = searchParams.get("propertyEquipmentId") ?? undefined;
  if (
    propertyEquipmentId &&
    !(await getAccessiblePropertyEquipment(context.user.organizationId, scope, propertyEquipmentId))
  ) {
    return NextResponse.json({ inspections: [] });
  }

  const rows = await listInspections(context.user.organizationId, {
    propertyId: searchParams.get("propertyId") ?? undefined,
    propertyEquipmentId,
    templateId: searchParams.get("templateId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    inspectorUserId: searchParams.get("inspectorUserId") ?? undefined,
    propertyIds: listAccessiblePropertyIds(scope),
  });
  // UNIT-OPS-1: another Unit's Inspections are dropped entirely; a visible
  // legacy Shared Inspection on another Unit's Equipment keeps UNIT-EQUIP-1's
  // link redaction.
  const hiddenEquipmentIds = await resolveHiddenEquipmentIds(context.user.organizationId, scope);
  const inspections = filterAccessibleInspections(scope, rows).map((row) =>
    redactHiddenEquipmentLink(row, hiddenEquipmentIds),
  );

  return NextResponse.json({ inspections });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(INSPECTION_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createInspectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, context.capabilityKeys);
  if (!canAccessProperty(scope, parsed.data.propertyId)) {
    return NextResponse.json(forbiddenResponseBody(), { status: 403 });
  }

  const property = await getProperty(user.organizationId, parsed.data.propertyId);
  if (!property) {
    return NextResponse.json({ error: "invalid_property" }, { status: 400 });
  }

  const equipment = parsed.data.propertyEquipmentId
    ? await getAccessiblePropertyEquipment(user.organizationId, scope, parsed.data.propertyEquipmentId)
    : null;
  if (parsed.data.propertyEquipmentId && (!equipment || equipment.propertyId !== parsed.data.propertyId)) {
    return NextResponse.json({ error: "invalid_equipment" }, { status: 400 });
  }

  // UNIT-OPS-1: same Unit + Equipment-consistency rule as Work Orders.
  const unit = await resolveRecordUnit({
    organizationId: user.organizationId,
    scope,
    property,
    mode: "create",
    requestedUnitId: parsed.data.propertyUnitId,
    currentUnitId: null,
    equipmentUnitId: equipment?.propertyUnitId ?? null,
    recordNoun: "inspections",
  });
  if (!unit.ok) {
    return NextResponse.json(unit.body, { status: unit.status });
  }

  if (
    (parsed.data.scheduledStartAt || parsed.data.scheduledEndAt) &&
    !context.capabilityKeys.includes(INSPECTION_CAPABILITIES.SCHEDULE)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const created = await createInspection(user.organizationId, user.id, {
    ...parsed.data,
    propertyUnitId: unit.propertyUnitId,
  });
  if (!created) {
    return NextResponse.json({ error: "invalid_template" }, { status: 400 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "inspection.create",
    entityType: "inspection",
    entityId: created.inspection.id,
    after: created.inspection,
  });

  if (
    created.inspection.scheduledStartAt &&
    created.inspection.inspectorUserId &&
    (await canUserAccessPropertyUnit(
      user.organizationId,
      created.inspection.inspectorUserId,
      created.inspection.propertyId,
      created.inspection.propertyUnitId,
    ))
  ) {
    await createNotification({
      organizationId: user.organizationId,
      recipientUserId: created.inspection.inspectorUserId,
      actorUserId: user.id,
      ...buildInspectionScheduledNotification(created.inspection),
    });
  }

  return NextResponse.json({ inspection: created.inspection, responses: created.responses }, { status: 201 });
}
