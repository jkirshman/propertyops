import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import {
  getPreventiveMaintenancePlan,
  updatePreventiveMaintenancePlan,
} from "@/lib/preventive-maintenance/plans";
import { getPropertyComponent } from "@/lib/property-components/property-components";
import { getWorkOrderCategory } from "@/lib/work-orders/categories";
import { updatePreventiveMaintenancePlanSchema } from "@/lib/validation/preventive-maintenance";
import { vendorCoversProperty } from "@/lib/vendors/coverage";
import { getVendor } from "@/lib/vendors/vendors";

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key))) as Partial<T>;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const plan = await getPreventiveMaintenancePlan(context.user.organizationId, id);
  if (!plan) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const existing = await getPreventiveMaintenancePlan(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePreventiveMaintenancePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const fields = parsed.data;

  if (fields.isActive !== undefined && !capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.MANAGE_STATUS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const otherFieldsTouched =
    fields.propertyEquipmentId !== undefined ||
    fields.propertyComponentId !== undefined ||
    fields.categoryId !== undefined ||
    fields.name !== undefined ||
    fields.description !== undefined ||
    fields.instructions !== undefined ||
    fields.defaultPriority !== undefined ||
    fields.defaultAssigneeUserId !== undefined ||
    fields.defaultVendorId !== undefined ||
    fields.intervalUnit !== undefined ||
    fields.intervalValue !== undefined ||
    fields.nextDueAt !== undefined;
  if (otherFieldsTouched && !capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (fields.categoryId) {
    const category = await getWorkOrderCategory(user.organizationId, fields.categoryId);
    if (!category) {
      return NextResponse.json({ error: "invalid_category" }, { status: 400 });
    }
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

  if (fields.defaultVendorId) {
    const vendor = await getVendor(user.organizationId, fields.defaultVendorId);
    if (!vendor) {
      return NextResponse.json({ error: "invalid_vendor" }, { status: 400 });
    }
    if (!(await vendorCoversProperty(user.organizationId, vendor, existing.propertyId))) {
      return NextResponse.json({ error: "invalid_vendor_coverage" }, { status: 400 });
    }
  }

  const updated = await updatePreventiveMaintenancePlan(user.organizationId, id, fields);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, fields);
  if (diff) {
    const changedKeys = Object.keys(diff.after);

    if (changedKeys.includes("isActive")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.isActive ? "preventive_maintenance_plan.activated" : "preventive_maintenance_plan.deactivated",
        entityType: "preventive_maintenance_plan",
        entityId: id,
        before: pick(diff.before, ["isActive"]),
        after: pick(diff.after, ["isActive"]),
      });
    }

    if (changedKeys.includes("nextDueAt")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "preventive_maintenance_plan.next_due_changed",
        entityType: "preventive_maintenance_plan",
        entityId: id,
        before: pick(diff.before, ["nextDueAt"]),
        after: pick(diff.after, ["nextDueAt"]),
      });
    }

    if (changedKeys.includes("defaultAssigneeUserId")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "preventive_maintenance_plan.reassigned",
        entityType: "preventive_maintenance_plan",
        entityId: id,
        before: pick(diff.before, ["defaultAssigneeUserId"]),
        after: pick(diff.after, ["defaultAssigneeUserId"]),
      });
    }

    if (changedKeys.includes("defaultVendorId")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "preventive_maintenance_plan.vendor_reassigned",
        entityType: "preventive_maintenance_plan",
        entityId: id,
        before: pick(diff.before, ["defaultVendorId"]),
        after: pick(diff.after, ["defaultVendorId"]),
      });
    }

    const remainingKeys = changedKeys.filter(
      (key) => !["isActive", "nextDueAt", "defaultAssigneeUserId", "defaultVendorId"].includes(key),
    );
    if (remainingKeys.length > 0) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "preventive_maintenance_plan.update",
        entityType: "preventive_maintenance_plan",
        entityId: id,
        before: pick(diff.before, remainingKeys),
        after: pick(diff.after, remainingKeys),
      });
    }
  }

  return NextResponse.json({ plan: updated });
}
