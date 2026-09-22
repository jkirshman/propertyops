import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canUserAccessPropertyUnit, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { diffFields } from "@/lib/db/diff-fields";
import { stripUndefined } from "@/lib/db/strip-undefined";
import {
  isEquipmentLinkHidden,
  redactHiddenEquipmentLink,
  resolveHiddenEquipmentIds,
} from "@/lib/equipment/equipment-access";
import { getAccessiblePropertyEquipment, getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { getAccessibleInspection } from "@/lib/inspections/inspection-access";
import { cancelInspection, getInspection, updateInspection } from "@/lib/inspections/inspections";
import {
  buildInspectionRescheduledNotification,
  buildInspectionScheduledNotification,
} from "@/lib/inspections/notification-events";
import { createNotification } from "@/lib/notifications/notifications";
import { getProperty } from "@/lib/properties/properties";
import { describeUnitForAudit } from "@/lib/property-units/property-units";
import { resolveRecordUnit } from "@/lib/property-units/record-units";
import { updateInspectionSchema } from "@/lib/validation/inspections";

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key))) as Partial<T>;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(INSPECTION_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  // UNIT-OPS-1: another Unit's Inspection is a 404, same as another Property's.
  const inspection = await getAccessibleInspection(context.user.organizationId, scope, id);
  if (!inspection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const hiddenEquipmentIds = await resolveHiddenEquipmentIds(context.user.organizationId, scope);
  return NextResponse.json({ inspection: redactHiddenEquipmentLink(inspection, hiddenEquipmentIds) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(INSPECTION_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  const existing = await getAccessibleInspection(user.organizationId, scope, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateInspectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const fields = parsed.data;

  // Completion has its own endpoint (validates required items, computes the
  // result) — this route only ever accepts a transition to 'cancelled'.
  if (fields.status !== undefined && fields.status !== "cancelled") {
    return NextResponse.json({ error: "invalid_status_transition" }, { status: 400 });
  }

  // UNIT-EQUIP-1: same rule as Work Orders — a hidden Equipment link can't be
  // changed by someone who can't see it, and only visible Equipment can be linked.
  if (fields.propertyEquipmentId !== undefined) {
    const hiddenEquipmentIds = await resolveHiddenEquipmentIds(user.organizationId, scope);
    if (isEquipmentLinkHidden(hiddenEquipmentIds, existing.propertyEquipmentId)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const newEquipment = fields.propertyEquipmentId
    ? await getAccessiblePropertyEquipment(user.organizationId, scope, fields.propertyEquipmentId)
    : null;
  if (fields.propertyEquipmentId && (!newEquipment || newEquipment.propertyId !== existing.propertyId)) {
    return NextResponse.json({ error: "invalid_equipment" }, { status: 400 });
  }

  // UNIT-OPS-1: same rule as Work Order PATCH — re-checked whenever the Unit
  // or Equipment link changes, against the Equipment linked afterwards.
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
      recordNoun: "inspections",
    });
    if (!unit.ok) {
      return NextResponse.json(unit.body, { status: unit.status });
    }
    if (unit.changed) {
      unitChange = { from: existing.propertyUnitId, to: unit.propertyUnitId };
    }
  }

  if (
    (fields.scheduledStartAt !== undefined || fields.scheduledEndAt !== undefined) &&
    !context.capabilityKeys.includes(INSPECTION_CAPABILITIES.SCHEDULE)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // The requested Unit is never written or diffed as-is — only the resolved
  // move (unitChange), which gets its own audit event below.
  const { status: statusChange, ...nonStatusFields } = fields;
  const updateFields = stripUndefined({ ...nonStatusFields, propertyUnitId: undefined });

  if (statusChange === "cancelled") {
    const cancelled = await cancelInspection(user.organizationId, id);
    if (!cancelled) {
      return NextResponse.json({ error: "cannot_cancel" }, { status: 409 });
    }
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "inspection.cancelled",
      entityType: "inspection",
      entityId: id,
      before: { status: existing.status },
      after: { status: "cancelled" },
    });
  }

  if (Object.keys(updateFields).length === 0 && !unitChange) {
    const current = await getInspection(user.organizationId, id);
    return NextResponse.json({
      inspection: current
        ? redactHiddenEquipmentLink(current, await resolveHiddenEquipmentIds(user.organizationId, scope))
        : null,
    });
  }

  const updated = await updateInspection(
    user.organizationId,
    id,
    unitChange ? { ...updateFields, propertyUnitId: unitChange.to } : updateFields,
  );
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, {
    ...updateFields,
    scheduledStartAt:
      updateFields.scheduledStartAt !== undefined
        ? updateFields.scheduledStartAt
          ? new Date(updateFields.scheduledStartAt)
          : null
        : undefined,
    scheduledEndAt:
      updateFields.scheduledEndAt !== undefined
        ? updateFields.scheduledEndAt
          ? new Date(updateFields.scheduledEndAt)
          : null
        : undefined,
  });
  if (diff) {
    const changedKeys = Object.keys(diff.after);

    if (changedKeys.includes("scheduledStartAt") || changedKeys.includes("scheduledEndAt")) {
      const wasScheduled = Boolean(existing.scheduledStartAt);
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: wasScheduled ? "inspection.rescheduled" : "inspection.scheduled",
        entityType: "inspection",
        entityId: id,
        before: pick(diff.before, ["scheduledStartAt", "scheduledEndAt"]),
        after: pick(diff.after, ["scheduledStartAt", "scheduledEndAt"]),
      });

      if (
        updated.inspectorUserId &&
        updated.scheduledStartAt &&
        (await canUserAccessPropertyUnit(
          user.organizationId,
          updated.inspectorUserId,
          updated.propertyId,
          updated.propertyUnitId,
        ))
      ) {
        await createNotification({
          organizationId: user.organizationId,
          recipientUserId: updated.inspectorUserId,
          actorUserId: user.id,
          ...(wasScheduled
            ? buildInspectionRescheduledNotification(updated)
            : buildInspectionScheduledNotification(updated)),
        });
      }
    }

    const remainingKeys = changedKeys.filter(
      (key) => !["scheduledStartAt", "scheduledEndAt"].includes(key),
    );
    if (remainingKeys.length > 0) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "inspection.update",
        entityType: "inspection",
        entityId: id,
        before: pick(diff.before, remainingKeys),
        after: pick(diff.after, remainingKeys),
      });
    }
  }

  // UNIT-OPS-1: dedicated event for every Unit move; propertyUnitId is kept
  // out of the generic inspection.update event so nothing is logged twice.
  if (unitChange) {
    const [before, after] = await Promise.all([
      describeUnitForAudit(user.organizationId, existing.propertyId, unitChange.from),
      describeUnitForAudit(user.organizationId, existing.propertyId, unitChange.to),
    ]);
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "inspection.unit_changed",
      entityType: "inspection",
      entityId: id,
      before,
      after,
    });
  }

  return NextResponse.json({
    inspection: redactHiddenEquipmentLink(updated, await resolveHiddenEquipmentIds(user.organizationId, scope)),
  });
}
