import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { cancelInspection, getInspection, updateInspection } from "@/lib/inspections/inspections";
import {
  buildInspectionRescheduledNotification,
  buildInspectionScheduledNotification,
} from "@/lib/inspections/notification-events";
import { createNotification } from "@/lib/notifications/notifications";
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
  const inspection = await getInspection(context.user.organizationId, id);
  if (!inspection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ inspection });
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
  const { user } = context;

  const existing = await getInspection(user.organizationId, id);
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

  if (fields.propertyEquipmentId) {
    const equipment = await getPropertyEquipment(user.organizationId, fields.propertyEquipmentId);
    if (!equipment || equipment.propertyId !== existing.propertyId) {
      return NextResponse.json({ error: "invalid_equipment" }, { status: 400 });
    }
  }

  if (
    (fields.scheduledStartAt !== undefined || fields.scheduledEndAt !== undefined) &&
    !context.capabilityKeys.includes(INSPECTION_CAPABILITIES.SCHEDULE)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { status: statusChange, ...updateFields } = fields;

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

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ inspection: await getInspection(user.organizationId, id) });
  }

  const updated = await updateInspection(user.organizationId, id, updateFields);
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

      if (updated.inspectorUserId && updated.scheduledStartAt) {
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

  return NextResponse.json({ inspection: updated });
}
