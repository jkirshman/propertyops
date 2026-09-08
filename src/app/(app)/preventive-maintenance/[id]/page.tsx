import Link from "next/link";
import { notFound } from "next/navigation";

import { PreventiveMaintenanceDetailPanel } from "@/components/preventive-maintenance/PreventiveMaintenanceDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { getPreventiveMaintenancePlan } from "@/lib/preventive-maintenance/plans";
import { getProperty } from "@/lib/properties/properties";
import { listOrganizationUsers } from "@/lib/users/users";
import { getVendor } from "@/lib/vendors/vendors";
import { getWorkOrderCategory } from "@/lib/work-orders/categories";

export default async function PreventiveMaintenancePlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(PREVENTIVE_MAINTENANCE_CAPABILITIES.VIEW, "/preventive-maintenance");

  const plan = await getPreventiveMaintenancePlan(context.user.organizationId, id);
  if (!plan) {
    notFound();
  }

  const [property, equipment, category, users, vendor] = await Promise.all([
    getProperty(context.user.organizationId, plan.propertyId),
    plan.propertyEquipmentId
      ? getPropertyEquipment(context.user.organizationId, plan.propertyEquipmentId)
      : Promise.resolve(null),
    getWorkOrderCategory(context.user.organizationId, plan.categoryId),
    listOrganizationUsers(context.user.organizationId),
    plan.defaultVendorId ? getVendor(context.user.organizationId, plan.defaultVendorId) : Promise.resolve(null),
  ]);

  const assignee = plan.defaultAssigneeUserId
    ? users.find((user) => user.id === plan.defaultAssigneeUserId)
    : null;

  const { capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {property ? <Link href={`/properties/${property.id}`}>{property.name}</Link> : "Unknown property"}
            {!plan.isActive ? " · Inactive" : ""}
          </div>
          <h1 style={{ marginBottom: "0.3rem" }}>{plan.name}</h1>
        </div>
      </div>

      <PreventiveMaintenanceDetailPanel
        initialPlan={{
          id: plan.id,
          name: plan.name,
          description: plan.description,
          instructions: plan.instructions,
          defaultPriority: plan.defaultPriority,
          isActive: plan.isActive,
          nextDueAt: plan.nextDueAt,
          lastGeneratedAt: plan.lastGeneratedAt ? plan.lastGeneratedAt.toISOString() : null,
          lastCompletedAt: plan.lastCompletedAt ? plan.lastCompletedAt.toISOString() : null,
          intervalUnit: plan.intervalUnit,
          intervalValue: plan.intervalValue,
        }}
        propertyName={property?.name ?? "Unknown property"}
        equipmentName={equipment?.displayName ?? null}
        categoryName={category?.name ?? "Unknown category"}
        assigneeName={assignee?.displayName ?? null}
        vendorName={vendor?.name ?? null}
        canEdit={capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.EDIT)}
        canManageStatus={capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.MANAGE_STATUS)}
        canGenerate={capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.GENERATE)}
      />
    </div>
  );
}
