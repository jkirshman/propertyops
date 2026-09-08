import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { getInspection } from "@/lib/inspections/inspections";
import { getInspectionResponse } from "@/lib/inspections/responses";
import { createWorkOrderSchema } from "@/lib/validation/work-orders";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";
import { createWorkOrder } from "@/lib/work-orders/work-orders";

/**
 * Explicit, user-initiated conversion of a single inspection finding into a
 * Work Order. Never triggered automatically by a failed response. Property/
 * equipment are always taken from the inspection itself, never the client
 * payload, so the Work Order can't end up linked to the wrong place.
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

  const inspection = await getInspection(user.organizationId, id);
  if (!inspection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const response = await getInspectionResponse(user.organizationId, id, responseId);
  if (!response) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkOrderSchema.safeParse({
    ...body,
    propertyId: inspection.propertyId,
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
