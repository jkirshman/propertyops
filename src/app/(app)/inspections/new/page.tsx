import { InspectionForm } from "@/components/inspections/InspectionForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { listProperties } from "@/lib/properties/properties";
import { listOrganizationUsers } from "@/lib/users/users";

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; equipmentId?: string }>;
}) {
  const context = await requireCapability(INSPECTION_CAPABILITIES.CREATE, "/inspections");
  const { propertyId, equipmentId } = await searchParams;

  const equipment = equipmentId
    ? await getPropertyEquipment(context.user.organizationId, equipmentId)
    : null;

  const [properties, users] = await Promise.all([
    listProperties(context.user.organizationId, { isActive: true }),
    listOrganizationUsers(context.user.organizationId),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>New Inspection</h1>
        <p className="muted">Start a checklist-driven inspection for a property or a piece of equipment.</p>
      </div>
      <InspectionForm
        properties={properties}
        users={users}
        initialPropertyId={equipment?.propertyId ?? propertyId}
        initialEquipmentId={equipment?.id}
      />
    </div>
  );
}
