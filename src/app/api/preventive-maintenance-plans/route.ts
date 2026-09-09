import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getWorkOrderCategory } from "@/lib/work-orders/categories";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES, type PmDueState } from "@/lib/preventive-maintenance/constants";
import {
  createPreventiveMaintenancePlan,
  listPreventiveMaintenancePlans,
} from "@/lib/preventive-maintenance/plans";
import { getPropertyComponent } from "@/lib/property-components/property-components";
import { createPreventiveMaintenancePlanSchema } from "@/lib/validation/preventive-maintenance";
import { vendorCoversProperty } from "@/lib/vendors/coverage";
import { getVendor } from "@/lib/vendors/vendors";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeParam = searchParams.get("active");

  const plans = await listPreventiveMaintenancePlans(context.user.organizationId, {
    search: searchParams.get("search") ?? undefined,
    propertyId: searchParams.get("propertyId") ?? undefined,
    propertyEquipmentId: searchParams.get("propertyEquipmentId") ?? undefined,
    isActive: activeParam === "true" ? true : activeParam === "false" ? false : undefined,
    defaultAssigneeUserId: searchParams.get("assignedUserId") ?? undefined,
    dueState: (searchParams.get("dueState") as PmDueState | null) ?? undefined,
  });

  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPreventiveMaintenancePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;

  const category = await getWorkOrderCategory(user.organizationId, parsed.data.categoryId);
  if (!category) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  if (parsed.data.propertyEquipmentId) {
    const equipment = await getPropertyEquipment(user.organizationId, parsed.data.propertyEquipmentId);
    if (!equipment || equipment.propertyId !== parsed.data.propertyId) {
      return NextResponse.json({ error: "invalid_equipment" }, { status: 400 });
    }
  }

  if (parsed.data.propertyComponentId) {
    const component = await getPropertyComponent(user.organizationId, parsed.data.propertyComponentId);
    if (!component || component.propertyId !== parsed.data.propertyId) {
      return NextResponse.json({ error: "invalid_component" }, { status: 400 });
    }
  }

  if (parsed.data.defaultVendorId) {
    const vendor = await getVendor(user.organizationId, parsed.data.defaultVendorId);
    if (!vendor) {
      return NextResponse.json({ error: "invalid_vendor" }, { status: 400 });
    }
    if (!(await vendorCoversProperty(user.organizationId, vendor, parsed.data.propertyId))) {
      return NextResponse.json({ error: "invalid_vendor_coverage" }, { status: 400 });
    }
  }

  const plan = await createPreventiveMaintenancePlan(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "preventive_maintenance_plan.create",
    entityType: "preventive_maintenance_plan",
    entityId: plan.id,
    after: plan,
  });

  return NextResponse.json({ plan }, { status: 201 });
}
