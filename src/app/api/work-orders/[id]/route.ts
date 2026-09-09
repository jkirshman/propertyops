import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { getAsset } from "@/lib/assets/assets";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { createNotification } from "@/lib/notifications/notifications";
import { syncPreventiveMaintenanceOccurrenceStatus } from "@/lib/preventive-maintenance/occurrences";
import { getPropertyComponent } from "@/lib/property-components/property-components";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { getVendor } from "@/lib/vendors/vendors";
import { updateWorkOrderSchema } from "@/lib/validation/work-orders";
import { WORK_ORDER_CAPABILITIES, type WorkOrderStatus } from "@/lib/work-orders/constants";
import {
  buildWorkOrderAssignedNotification,
  buildWorkOrderClosedNotification,
  buildWorkOrderRescheduledNotification,
  buildWorkOrderResolvedNotification,
  buildWorkOrderScheduledNotification,
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
  if (fields.vendorId !== undefined && !capabilityKeys.includes(VENDOR_CAPABILITIES.ASSIGN_WORK_ORDERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (
    (fields.scheduledStartAt !== undefined || fields.scheduledEndAt !== undefined) &&
    !capabilityKeys.includes(WORK_ORDER_CAPABILITIES.SCHEDULE)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const otherFieldsTouched =
    fields.subject !== undefined ||
    fields.description !== undefined ||
    fields.categoryId !== undefined ||
    fields.priority !== undefined ||
    fields.propertyEquipmentId !== undefined ||
    fields.propertyComponentId !== undefined ||
    fields.assetId !== undefined ||
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

  if (fields.propertyComponentId) {
    const component = await getPropertyComponent(user.organizationId, fields.propertyComponentId);
    if (!component || component.propertyId !== existing.propertyId) {
      return NextResponse.json({ error: "invalid_component" }, { status: 400 });
    }
  }

  if (fields.assetId) {
    const asset = await getAsset(user.organizationId, fields.assetId);
    if (!asset) {
      return NextResponse.json({ error: "invalid_asset" }, { status: 400 });
    }
  }

  if (fields.vendorId) {
    const vendor = await getVendor(user.organizationId, fields.vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "invalid_vendor" }, { status: 400 });
    }
  }

  const timestampUpdates = fields.status
    ? computeStatusTimestampUpdates(fields.status as WorkOrderStatus, new Date())
    : {};

  const updated = await updateWorkOrder(user.organizationId, id, fields, timestampUpdates);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, {
    ...fields,
    scheduledStartAt:
      fields.scheduledStartAt !== undefined
        ? fields.scheduledStartAt
          ? new Date(fields.scheduledStartAt)
          : null
        : undefined,
    scheduledEndAt:
      fields.scheduledEndAt !== undefined
        ? fields.scheduledEndAt
          ? new Date(fields.scheduledEndAt)
          : null
        : undefined,
  });
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

      await syncPreventiveMaintenanceOccurrenceStatus(
        user.organizationId,
        { ...updated, status: updated.status as WorkOrderStatus },
        user.id,
      );

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

    if (changedKeys.includes("vendorId")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.vendorId ? "work_order.vendor_assigned" : "work_order.vendor_unassigned",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, ["vendorId"]),
        after: pick(diff.after, ["vendorId"]),
      });
    }

    if (changedKeys.includes("scheduledStartAt") || changedKeys.includes("scheduledEndAt")) {
      const wasScheduled = Boolean(existing.scheduledStartAt);
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: wasScheduled ? "work_order.rescheduled" : "work_order.scheduled",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, ["scheduledStartAt", "scheduledEndAt"]),
        after: pick(diff.after, ["scheduledStartAt", "scheduledEndAt"]),
      });

      if (updated.assignedUserId && updated.scheduledStartAt) {
        await createNotification({
          organizationId: user.organizationId,
          recipientUserId: updated.assignedUserId,
          actorUserId: user.id,
          ...(wasScheduled
            ? buildWorkOrderRescheduledNotification(updated)
            : buildWorkOrderScheduledNotification(updated)),
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

    if (changedKeys.includes("propertyComponentId")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.propertyComponentId
          ? "work_order.component_linked"
          : "work_order.component_unlinked",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, ["propertyComponentId"]),
        after: pick(diff.after, ["propertyComponentId"]),
      });
    }

    if (changedKeys.includes("assetId")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.assetId ? "work_order.asset_linked" : "work_order.asset_unlinked",
        entityType: "work_order",
        entityId: id,
        before: pick(diff.before, ["assetId"]),
        after: pick(diff.after, ["assetId"]),
      });
    }

    const remainingKeys = changedKeys.filter(
      (key) =>
        ![
          "status",
          "priority",
          "categoryId",
          "assignedUserId",
          "vendorId",
          "propertyEquipmentId",
          "propertyComponentId",
          "assetId",
          "scheduledStartAt",
          "scheduledEndAt",
        ].includes(key),
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
