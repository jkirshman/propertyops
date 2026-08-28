import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { createNotification } from "@/lib/notifications/notifications";
import { updateWorkOrderSchema } from "@/lib/validation/work-orders";
import { WORK_ORDER_CAPABILITIES, type WorkOrderStatus } from "@/lib/work-orders/constants";
import {
  buildWorkOrderAssignedNotification,
  buildWorkOrderClosedNotification,
  buildWorkOrderResolvedNotification,
} from "@/lib/work-orders/notification-events";
import { computeStatusTimestampUpdates } from "@/lib/work-orders/status-transitions";
import { getWorkOrder, updateWorkOrder } from "@/lib/work-orders/work-orders";

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key))) as Partial<T>;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const workOrder = await getWorkOrder(context.user.organizationId, id);
  if (!workOrder) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ workOrder });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const existing = await getWorkOrder(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateWorkOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const fields = parsed.data;

  if (fields.status !== undefined && !capabilityKeys.includes(WORK_ORDER_CAPABILITIES.MANAGE_STATUS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (fields.assignedUserId !== undefined && !capabilityKeys.includes(WORK_ORDER_CAPABILITIES.ASSIGN)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const otherFieldsTouched =
    fields.subject !== undefined ||
    fields.description !== undefined ||
    fields.categoryId !== undefined ||
    fields.priority !== undefined ||
    fields.propertyEquipmentId !== undefined ||
    fields.resolutionSummary !== undefined;
  if (otherFieldsTouched && !capabilityKeys.includes(WORK_ORDER_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (fields.propertyEquipmentId) {
    const equipment = await getPropertyEquipment(user.organizationId, fields.propertyEquipmentId);
    if (!equipment || equipment.propertyId !== existing.propertyId) {
      return NextResponse.json({ error: "invalid_equipment" }, { status: 400 });
    }
  }

  const timestampUpdates = fields.status
    ? computeStatusTimestampUpdates(fields.status as WorkOrderStatus, new Date())
    : {};

  const updated = await updateWorkOrder(user.organizationId, id, fields, timestampUpdates);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, fields);
  if (diff) {
    const changedKeys = Object.keys(diff.after);

    if (changedKeys.includes("status")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "work_order.status_changed",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, ["status"]),
        after: pick(diff.after, ["status"]),
      });

      const recipientId = updated.requesterUserId;
      if (recipientId && recipientId !== user.id) {
        if (updated.status === "resolved") {
          await createNotification({
            organizationId: user.organizationId,
            recipientUserId: recipientId,
            actorUserId: user.id,
            ...buildWorkOrderResolvedNotification(updated),
          });
        } else if (updated.status === "closed") {
          await createNotification({
            organizationId: user.organizationId,
            recipientUserId: recipientId,
            actorUserId: user.id,
            ...buildWorkOrderClosedNotification(updated),
          });
        }
      }
    }

    if (changedKeys.includes("priority")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "work_order.priority_changed",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, ["priority"]),
        after: pick(diff.after, ["priority"]),
      });
    }

    if (changedKeys.includes("categoryId")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "work_order.category_changed",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, ["categoryId"]),
        after: pick(diff.after, ["categoryId"]),
      });
    }

    if (changedKeys.includes("assignedUserId")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.assignedUserId ? "work_order.assigned" : "work_order.unassigned",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, ["assignedUserId"]),
        after: pick(diff.after, ["assignedUserId"]),
      });

      if (updated.assignedUserId && updated.assignedUserId !== user.id) {
        await createNotification({
          organizationId: user.organizationId,
          recipientUserId: updated.assignedUserId,
          actorUserId: user.id,
          ...buildWorkOrderAssignedNotification(updated),
        });
      }
    }

    if (changedKeys.includes("propertyEquipmentId")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.propertyEquipmentId
          ? "work_order.equipment_linked"
          : "work_order.equipment_unlinked",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, ["propertyEquipmentId"]),
        after: pick(diff.after, ["propertyEquipmentId"]),
      });
    }

    const remainingKeys = changedKeys.filter(
      (key) =>
        !["status", "priority", "categoryId", "assignedUserId", "propertyEquipmentId"].includes(key),
    );
    if (remainingKeys.length > 0) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "work_order.update",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, remainingKeys),
        after: pick(diff.after, remainingKeys),
      });
    }
  }

  return NextResponse.json({ workOrder: updated });
}
