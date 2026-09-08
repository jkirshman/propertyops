import { PreventiveMaintenanceForm } from "@/components/preventive-maintenance/PreventiveMaintenanceForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { listProperties } from "@/lib/properties/properties";
import { listOrganizationUsers } from "@/lib/users/users";
import { listVendors } from "@/lib/vendors/vendors";
import { listWorkOrderCategories } from "@/lib/work-orders/categories";

export default async function NewPreventiveMaintenancePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; equipmentId?: string }>;
}) {
  const context = await requireCapability(
    PREVENTIVE_MAINTENANCE_CAPABILITIES.CREATE,
    "/preventive-maintenance",
  );
  const { propertyId, equipmentId } = await searchParams;

  const equipment = equipmentId
    ? await getPropertyEquipment(context.user.organizationId, equipmentId)
    : null;

  const [properties, categories, users, vendors] = await Promise.all([
    listProperties(context.user.organizationId, { isActive: true }),
    listWorkOrderCategories(context.user.organizationId, { activeOnly: true }),
    listOrganizationUsers(context.user.organizationId),
    listVendors(context.user.organizationId, { isActive: true }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>New Preventive Maintenance Plan</h1>
        <p className="muted">Schedule recurring maintenance for a property or a piece of equipment.</p>
      </div>
      <PreventiveMaintenanceForm
        mode="create"
        properties={properties}
        categories={categories}
        users={users}
        vendors={vendors}
        initialValues={{
          propertyId: equipment?.propertyId ?? propertyId ?? "",
          propertyEquipmentId: equipment?.id ?? "",
        }}
      />
    </div>
  );
}
