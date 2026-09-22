import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { equipmentUnitAssignmentError, filterAccessibleEquipment } from "@/lib/equipment/equipment-access";
import {
  checkEquipmentUnitAssignment,
  createPropertyEquipment,
  getEquipmentUnitOptions,
  listPropertyEquipment,
} from "@/lib/equipment/property-equipment";
import { getProperty } from "@/lib/properties/properties";
import { createPropertyEquipmentSchema } from "@/lib/validation/property-equipment";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  // UNIT-EQUIP-1: every selector (Work Order, PM, Inspection) reads this
  // same list, so filtering here keeps other Units' Equipment out of all of
  // them. Unit options are only resolved for editors — a view-only User
  // never needs (or sees) the Property's Unit list through this route.
  const rows = await listPropertyEquipment(context.user.organizationId, id, { activeOnly });
  const equipment = filterAccessibleEquipment(scope, rows);

  const canAssignUnits =
    capabilityKeys.includes(EQUIPMENT_CAPABILITIES.CREATE) || capabilityKeys.includes(EQUIPMENT_CAPABILITIES.EDIT);
  const property = canAssignUnits ? await getProperty(user.organizationId, id) : null;
  const unitOptions = property ? await getEquipmentUnitOptions(user.organizationId, property, scope) : null;

  return NextResponse.json({ equipment, unitOptions });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const property = await getProperty(user.organizationId, id);
  if (!property) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPropertyEquipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const unitDecision = await checkEquipmentUnitAssignment({
    organizationId: user.organizationId,
    scope,
    property,
    mode: "create",
    requestedUnitId: parsed.data.propertyUnitId,
    currentUnitId: null,
  });
  if (unitDecision !== "allowed" && unitDecision !== "unchanged") {
    const { status, body: errorBody } = equipmentUnitAssignmentError(unitDecision);
    return NextResponse.json(errorBody, { status });
  }

  const equipment = await createPropertyEquipment(user.organizationId, id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property_equipment.create",
    entityType: "property_equipment",
    entityId: equipment.id,
    after: equipment,
  });

  return NextResponse.json({ equipment }, { status: 201 });
}
