import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessPropertyUnit, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { getAccessibleInspection } from "@/lib/inspections/inspection-access";
import { getInspectionResponse } from "@/lib/inspections/responses";
import { deriveGeneratedWorkOrderUnitId } from "@/lib/property-units/unit-assignment";
import { createWorkOrderSchema } from "@/lib/validation/work-orders";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";
import { createWorkOrder } from "@/lib/work-orders/work-orders";

/**
 * Explicit, user-initiated conversion of a single inspection finding into a
 * Work Order. Never triggered automatically by a failed response. Property/
 * equipment are always taken from the inspection itself, never the client
 * payload, so the Work Order can't end up linked to the wrong place.
 *
 * UNIT-OPS-1: the same goes for the Unit — the generated Work Order takes the
 * linked Equipment's Unit if it has one, otherwise the Inspection's own Unit
 * (Shared stays Shared). The operator never re-enters it, and a client-sent
 * propertyUnitId is ignored. Follows the source even if that Unit has since
 * been deactivated: the finding still happened there.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; responseId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { capabilityKeys, user } = context;
  if (
    !capabilityKeys.includes(INSPECTION_CAPABILITIES.VIEW) ||
    !capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, responseId } = await params;

  // UNIT-OPS-1: another Unit's Inspection is a 404, same as another Property's.
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  const inspection = await getAccessibleInspection(user.organizationId, scope, id);
  if (!inspection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const response = await getInspectionResponse(user.organizationId, id, responseId);
  if (!response) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const equipment = inspection.propertyEquipmentId
    ? await getPropertyEquipment(user.organizationId, inspection.propertyEquipmentId)
    : null;
  const propertyUnitId = deriveGeneratedWorkOrderUnitId({
    sourceUnitId: inspection.propertyUnitId,
    equipmentUnitId: equipment?.propertyUnitId ?? null,
  });
  // Only reachable for a legacy Shared Inspection linked to another Unit's
  // Equipment: the Work Order would land in a Unit the caller can't open.
  if (!canAccessPropertyUnit(scope, inspection.propertyId, propertyUnitId)) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "This inspection's equipment belongs to a Unit/Suite you can't access, so you can't create its work order.",
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkOrderSchema.safeParse({
    ...body,
    propertyId: inspection.propertyId,
    propertyUnitId,
    propertyEquipmentId: inspection.propertyEquipmentId ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const workOrder = await createWorkOrder(user.organizationId, user.id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "work_order.create",
    entityType: "work_order",
    entityId: workOrder.id,
    after: workOrder,
  });

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "inspection.finding_converted_to_work_order",
    entityType: "inspection",
    entityId: id,
    after: { responseId, itemLabel: response.itemLabel, workOrderId: workOrder.id },
  });

  return NextResponse.json({ workOrder }, { status: 201 });
}
