import { WorkOrderForm } from "@/components/work-orders/WorkOrderForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { listProperties } from "@/lib/properties/properties";
import { listOrganizationUsers } from "@/lib/users/users";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";
import { listWorkOrderCategories } from "@/lib/work-orders/categories";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; equipmentId?: string }>;
}) {
  const context = await requireCapability(WORK_ORDER_CAPABILITIES.CREATE, "/work-orders");
  const { propertyId, equipmentId } = await searchParams;

  const equipment = equipmentId
    ? await getPropertyEquipment(context.user.organizationId, equipmentId)
    : null;

  const [properties, categories, users] = await Promise.all([
    listProperties(context.user.organizationId, { isActive: true }),
    listWorkOrderCategories(context.user.organizationId, { activeOnly: true }),
    listOrganizationUsers(context.user.organizationId),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>New Work Order</h1>
        <p className="muted">Create a maintenance request for a property.</p>
      </div>
      <WorkOrderForm
        properties={properties}
        categories={categories}
        users={users}
        initialPropertyId={equipment?.propertyId ?? propertyId}
        initialEquipmentId={equipment?.id}
      />
    </div>
  );
}
