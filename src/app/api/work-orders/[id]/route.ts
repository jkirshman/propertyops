import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canUserAccessPropertyUnit, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { diffFields } from "@/lib/db/diff-fields";
import { getAsset } from "@/lib/assets/assets";
import {
  isEquipmentLinkHidden,
  redactHiddenEquipmentLink,
  resolveHiddenEquipmentIds,
} from "@/lib/equipment/equipment-access";
import { getAccessiblePropertyEquipment, getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { createNotification } from "@/lib/notifications/notifications";
import { syncPreventiveMaintenanceOccurrenceStatus } from "@/lib/preventive-maintenance/occurrences";
import { getProperty } from "@/lib/properties/properties";
import { getPropertyComponent } from "@/lib/property-components/property-components";
import { describeUnitForAudit } from "@/lib/property-units/property-units";
import { resolveRecordUnit } from "@/lib/property-units/record-units";
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
import { getAccessibleWorkOrder } from "@/lib/work-orders/work-order-access";
import { updateWorkOrder } from "@/lib/work-orders/work-orders";

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
  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  // UNIT-OPS-1: another Unit's Work Order is a 404, same as another Property's.
  const workOrder = await getAccessibleWorkOrder(context.user.organizationId, scope, id);
  if (!workOrder) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const hiddenEquipmentIds = await resolveHiddenEquipmentIds(context.user.organizationId, scope);
  return NextResponse.json({ workOrder: redactHiddenEquipmentLink(workOrder, hiddenEquipmentIds) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  const existing = await getAccessibleWorkOrder(user.organizationId, scope, id);
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
    fields.propertyUnitId !== undefined ||
    fields.propertyEquipmentId !== undefined ||
    fields.propertyComponentId !== undefined ||
    fields.assetId !== undefined ||
    fields.resolutionSummary !== undefined;
  if (otherFieldsTouched && !capabilityKeys.includes(WORK_ORDER_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const hiddenEquipmentIds = await resolveHiddenEquipmentIds(user.organizationId, scope);
  // UNIT-EQUIP-1: a caller who can't see the currently-linked Equipment can't
  // relink or unlink it either (the UI shows it as restricted, read-only).
  if (
    fields.propertyEquipmentId !== undefined &&
    isEquipmentLinkHidden(hiddenEquipmentIds, existing.propertyEquipmentId)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const newEquipment = fields.propertyEquipmentId
    ? await getAccessiblePropertyEquipment(user.organizationId, scope, fields.propertyEquipmentId)
    : null;
  if (fields.propertyEquipmentId && (!newEquipment || newEquipment.propertyId !== existing.propertyId)) {
    return NextResponse.json({ error: "invalid_equipment" }, { status: 400 });
  }

  // UNIT-OPS-1: re-checked whenever the Unit or the Equipment link changes,
  // against the Equipment the Work Order will be linked to afterwards.
  // Linking Unit-owned Equipment without naming a Unit moves the Work Order
  // to that Equipment's Unit (subject to the same assignment rule).
  let unitChange: { from: string | null; to: string | null } | null = null;
  if (fields.propertyUnitId !== undefined || fields.propertyEquipmentId !== undefined) {
    const targetEquipment =
      fields.propertyEquipmentId !== undefined
        ? newEquipment
        : existing.propertyEquipmentId
          ? await getPropertyEquipment(user.organizationId, existing.propertyEquipmentId)
          : null;
    const property = await getProperty(user.organizationId, existing.propertyId);
    if (!property) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const unit = await resolveRecordUnit({
      organizationId: user.organizationId,
      scope,
      property,
      mode: "update",
      requestedUnitId: fields.propertyUnitId,
      currentUnitId: existing.propertyUnitId,
      equipmentUnitId: targetEquipment?.propertyUnitId ?? null,
      recordNoun: "work orders",
    });
    if (!unit.ok) {
      return NextResponse.json(unit.body, { status: unit.status });
    }
    if (unit.changed) {
      unitChange = { from: existing.propertyUnitId, to: unit.propertyUnitId };
    }
  }
  // The requested Unit is never written or diffed as-is — only the resolved
  // move (unitChange), which gets its own audit event below.
  const otherFields = { ...fields, propertyUnitId: undefined };
  const writeFields = unitChange ? { ...otherFields, propertyUnitId: unitChange.to } : otherFields;

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

  const updated = await updateWorkOrder(user.organizationId, id, writeFields, timestampUpdates);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, {
    ...otherFields,
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
  // UNIT-OPS-1: notifications follow the Work Order's (possibly just
  // changed) Property/Unit — no title goes to someone who can't open it.
  const canNotify = (recipientUserId: string) =>
    canUserAccessPropertyUnit(user.organizationId, recipientUserId, updated.propertyId, updated.propertyUnitId);

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
      if (recipientId && recipientId !== user.id && (await canNotify(recipientId))) {
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

      if (updated.assignedUserId && updated.assignedUserId !== user.id && (await canNotify(updated.assignedUserId))) {
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

      if (updated.assignedUserId && updated.scheduledStartAt && (await canNotify(updated.assignedUserId))) {
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

  // UNIT-OPS-1: one dedicated event for every Unit move (Shared → Unit,
  // Unit → Shared, Unit A → Unit B, including a move implied by linking
  // Unit-owned Equipment). propertyUnitId never reaches the generic
  // work_order.update event, so nothing is logged twice.
  if (unitChange) {
    const [before, after] = await Promise.all([
      describeUnitForAudit(user.organizationId, existing.propertyId, unitChange.from),
      describeUnitForAudit(user.organizationId, existing.propertyId, unitChange.to),
    ]);
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "work_order.unit_changed",
      entityType: "work_order",
      entityId: id,
      before,
      after,
    });
  }

  return NextResponse.json({ workOrder: redactHiddenEquipmentLink(updated, hiddenEquipmentIds) });
}
