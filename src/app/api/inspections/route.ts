import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { createInspection, listInspections } from "@/lib/inspections/inspections";
import { buildInspectionScheduledNotification } from "@/lib/inspections/notification-events";
import { createNotification } from "@/lib/notifications/notifications";
import { createInspectionSchema } from "@/lib/validation/inspections";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(INSPECTION_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const inspections = await listInspections(context.user.organizationId, {
    propertyId: searchParams.get("propertyId") ?? undefined,
    propertyEquipmentId: searchParams.get("propertyEquipmentId") ?? undefined,
    templateId: searchParams.get("templateId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    inspectorUserId: searchParams.get("inspectorUserId") ?? undefined,
  });

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

  if (parsed.data.propertyEquipmentId) {
    const equipment = await getPropertyEquipment(user.organizationId, parsed.data.propertyEquipmentId);
    if (!equipment || equipment.propertyId !== parsed.data.propertyId) {
      return NextResponse.json({ error: "invalid_equipment" }, { status: 400 });
    }
  }

  if (
    (parsed.data.scheduledStartAt || parsed.data.scheduledEndAt) &&
    !context.capabilityKeys.includes(INSPECTION_CAPABILITIES.SCHEDULE)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const created = await createInspection(user.organizationId, user.id, parsed.data);
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

  if (created.inspection.scheduledStartAt && created.inspection.inspectorUserId) {
    await createNotification({
      organizationId: user.organizationId,
      recipientUserId: created.inspection.inspectorUserId,
      actorUserId: user.id,
      ...buildInspectionScheduledNotification(created.inspection),
    });
  }

  return NextResponse.json({ inspection: created.inspection, responses: created.responses }, { status: 201 });
}
