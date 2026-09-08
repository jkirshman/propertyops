import { notFound } from "next/navigation";

import {
  PreventiveMaintenanceForm,
  type PreventiveMaintenanceFormValues,
} from "@/components/preventive-maintenance/PreventiveMaintenanceForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { getPreventiveMaintenancePlan } from "@/lib/preventive-maintenance/plans";
import { getProperty } from "@/lib/properties/properties";
import { listOrganizationUsers } from "@/lib/users/users";
import { listVendors } from "@/lib/vendors/vendors";
import { listWorkOrderCategories } from "@/lib/work-orders/categories";

export default async function EditPreventiveMaintenancePlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(
    PREVENTIVE_MAINTENANCE_CAPABILITIES.EDIT,
    `/preventive-maintenance/${id}`,
  );

  const plan = await getPreventiveMaintenancePlan(context.user.organizationId, id);
  if (!plan) {
    notFound();
  }

  const [property, categories, users, vendors] = await Promise.all([
    getProperty(context.user.organizationId, plan.propertyId),
    listWorkOrderCategories(context.user.organizationId, { activeOnly: true }),
    listOrganizationUsers(context.user.organizationId),
    listVendors(context.user.organizationId, { isActive: true }),
  ]);

  const initialValues: Partial<PreventiveMaintenanceFormValues> = {
    propertyId: plan.propertyId,
    propertyEquipmentId: plan.propertyEquipmentId ?? "",
    categoryId: plan.categoryId,
    name: plan.name,
    description: plan.description ?? "",
    instructions: plan.instructions ?? "",
    defaultPriority: plan.defaultPriority,
    defaultAssigneeUserId: plan.defaultAssigneeUserId ?? "",
    defaultVendorId: plan.defaultVendorId ?? "",
    recurrencePreset: "custom",
    customIntervalUnit: plan.intervalUnit as "week" | "month",
    customIntervalValue: String(plan.intervalValue),
    nextDueAt: plan.nextDueAt,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>Edit {plan.name}</h1>
      </div>
      <PreventiveMaintenanceForm
        mode="edit"
        planId={plan.id}
        properties={[]}
        categories={categories}
        users={users}
        vendors={vendors}
        propertyName={property?.name ?? "Unknown property"}
        initialValues={initialValues}
      />
    </div>
  );
}
