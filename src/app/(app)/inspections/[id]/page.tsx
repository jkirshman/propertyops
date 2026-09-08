import Link from "next/link";
import { notFound } from "next/navigation";

import { InspectionDetailPanel } from "@/components/inspections/InspectionDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { INSPECTION_CAPABILITIES, INSPECTION_STATUS_LABELS, type InspectionStatus } from "@/lib/inspections/constants";
import { getInspection } from "@/lib/inspections/inspections";
import { getProperty } from "@/lib/properties/properties";
import { listOrganizationUsers } from "@/lib/users/users";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";
import { listWorkOrderCategories } from "@/lib/work-orders/categories";

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(INSPECTION_CAPABILITIES.VIEW, "/inspections");

  const inspection = await getInspection(context.user.organizationId, id);
  if (!inspection) {
    notFound();
  }

  const [property, equipment, categories, users] = await Promise.all([
    getProperty(context.user.organizationId, inspection.propertyId),
    inspection.propertyEquipmentId
      ? getPropertyEquipment(context.user.organizationId, inspection.propertyEquipmentId)
      : Promise.resolve(null),
    listWorkOrderCategories(context.user.organizationId, { activeOnly: true }),
    listOrganizationUsers(context.user.organizationId),
  ]);

  const inspector = inspection.inspectorUserId
    ? users.find((user) => user.id === inspection.inspectorUserId)
    : null;

  const { capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {property ? <Link href={`/properties/${property.id}`}>{property.name}</Link> : "Unknown property"}
            {equipment ? (
              <>
                {" · "}
                <Link href={`/equipment/${equipment.id}`}>{equipment.displayName}</Link>
              </>
            ) : ""}
          </div>
          <h1 style={{ marginBottom: "0.3rem" }}>{inspection.templateName}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {INSPECTION_STATUS_LABELS[inspection.status as InspectionStatus] ?? inspection.status}
            {inspector ? ` · Inspector: ${inspector.displayName}` : ""}
          </div>
        </div>
      </div>

      <InspectionDetailPanel
        initialInspection={{
          id: inspection.id,
          propertyId: inspection.propertyId,
          propertyEquipmentId: inspection.propertyEquipmentId,
          status: inspection.status,
          overallResult: inspection.overallResult,
          summary: inspection.summary,
          scheduledDate: inspection.scheduledDate,
        }}
        categories={categories}
        users={users}
        canEdit={capabilityKeys.includes(INSPECTION_CAPABILITIES.EDIT)}
        canComplete={capabilityKeys.includes(INSPECTION_CAPABILITIES.COMPLETE)}
        canCreateWorkOrder={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)}
      />
    </div>
  );
}
