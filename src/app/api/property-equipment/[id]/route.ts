import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import {
  buildEquipmentConditionPoorNotification,
  buildEquipmentOutOfServiceNotification,
} from "@/lib/equipment/notification-events";
import { getPropertyEquipment, updatePropertyEquipment } from "@/lib/equipment/property-equipment";
import { createNotification } from "@/lib/notifications/notifications";
import { listUsersWithCapability } from "@/lib/users/users";
import { updatePropertyEquipmentSchema } from "@/lib/validation/property-equipment";

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key))) as Partial<T>;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const equipment = await getPropertyEquipment(context.user.organizationId, id);
  if (!equipment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ equipment });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const existing = await getPropertyEquipment(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePropertyEquipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updatePropertyEquipment(user.organizationId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    const changedKeys = Object.keys(diff.after);

    if (changedKeys.includes("status")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "property_equipment.status_changed",
        entityType: "property_equipment",
        entityId: id,
        before: { status: diff.before.status },
        after: { status: diff.after.status },
      });

      if (updated.status === "out_of_service" && existing.status !== "out_of_service") {
        const recipients = await listUsersWithCapability(
          user.organizationId,
          EQUIPMENT_CAPABILITIES.MANAGE_SERVICE,
        );
        const notification = buildEquipmentOutOfServiceNotification(updated);
        for (const recipient of recipients) {
          if (recipient.id === user.id) continue;
          await createNotification({
            organizationId: user.organizationId,
            recipientUserId: recipient.id,
            actorUserId: user.id,
            ...notification,
          });
        }
      }
    }

    if (changedKeys.includes("condition")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "property_equipment.condition_changed",
        entityType: "property_equipment",
        entityId: id,
        before: { condition: diff.before.condition },
        after: { condition: diff.after.condition },
      });

      if (updated.condition === "poor" && existing.condition !== "poor") {
        const recipients = await listUsersWithCapability(
          user.organizationId,
          EQUIPMENT_CAPABILITIES.MANAGE_SERVICE,
        );
        const notification = buildEquipmentConditionPoorNotification(updated);
        for (const recipient of recipients) {
          if (recipient.id === user.id) continue;
          await createNotification({
            organizationId: user.organizationId,
            recipientUserId: recipient.id,
            actorUserId: user.id,
            ...notification,
          });
        }
      }
    }

    if (changedKeys.includes("isActive")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.isActive ? "property_equipment.activate" : "property_equipment.deactivate",
        entityType: "property_equipment",
        entityId: id,
        before: { isActive: diff.before.isActive },
        after: { isActive: diff.after.isActive },
      });
    }

    const remainingKeys = changedKeys.filter(
      (key) => !["status", "condition", "isActive"].includes(key),
    );
    if (remainingKeys.length > 0) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "property_equipment.update",
        entityType: "property_equipment",
        entityId: id,
        before: pick(diff.before, remainingKeys),
        after: pick(diff.after, remainingKeys),
      });
    }
  }

  return NextResponse.json({ equipment: updated });
}
