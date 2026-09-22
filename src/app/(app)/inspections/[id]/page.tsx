import Link from "next/link";
import { notFound } from "next/navigation";

import { InspectionDetailPanel } from "@/components/inspections/InspectionDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { getAccessiblePropertyEquipment } from "@/lib/equipment/property-equipment";
import { INSPECTION_CAPABILITIES, INSPECTION_STATUS_LABELS, type InspectionStatus } from "@/lib/inspections/constants";
import { getAccessibleInspection } from "@/lib/inspections/inspection-access";
import { getOrganizationTimezone } from "@/lib/organizations/organizations";
import { getProperty } from "@/lib/properties/properties";
import { getPropertyUnit } from "@/lib/property-units/property-units";
import { getRecordUnitOptions } from "@/lib/property-units/record-units";
import { formatRecordUnitLabel } from "@/lib/property-units/unit-display";
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

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  // UNIT-OPS-1: another Unit's Inspection is a 404, same as another Property's.
  const inspection = await getAccessibleInspection(context.user.organizationId, scope, id);
  if (!inspection) {
    notFound();
  }

  const [property, currentUnit, equipment, categories, users, timezone] = await Promise.all([
    getProperty(context.user.organizationId, inspection.propertyId),
    inspection.propertyUnitId
      ? getPropertyUnit(context.user.organizationId, inspection.propertyId, inspection.propertyUnitId)
      : Promise.resolve(null),
    // UNIT-EQUIP-1: another Unit's Equipment resolves to null — no name/link.
    inspection.propertyEquipmentId
      ? getAccessiblePropertyEquipment(context.user.organizationId, scope, inspection.propertyEquipmentId)
      : Promise.resolve(null),
    listWorkOrderCategories(context.user.organizationId, { activeOnly: true }),
    listOrganizationUsers(context.user.organizationId),
    getOrganizationTimezone(context.user.organizationId),
  ]);

  const inspector = inspection.inspectorUserId
    ? users.find((user) => user.id === inspection.inspectorUserId)
    : null;

  const { capabilityKeys } = context;
  // Only ever the viewer's own accessible Units — safe for view-only users too.
  const unitOptions = property ? await getRecordUnitOptions(context.user.organizationId, property, scope) : null;
  const unitLabel = formatRecordUnitLabel({
    propertyUnitId: inspection.propertyUnitId,
    unitLabel: currentUnit?.unitLabel ?? null,
    unitIsActive: currentUnit?.isActive ?? null,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {property ? <Link href={`/properties/${property.id}`} className="text-link">{property.name}</Link> : "Unknown property"}
            {inspection.propertyUnitId ? ` · ${unitLabel}` : ""}
            {equipment ? (
              <>
                {" · "}
                <Link href={`/equipment/${equipment.id}`} className="text-link">{equipment.displayName}</Link>
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
          propertyUnitId: inspection.propertyUnitId,
          propertyEquipmentId: inspection.propertyEquipmentId && equipment ? inspection.propertyEquipmentId : null,
          status: inspection.status,
          overallResult: inspection.overallResult,
          summary: inspection.summary,
          scheduledDate: inspection.scheduledDate,
          scheduledStartAt: inspection.scheduledStartAt ? inspection.scheduledStartAt.toISOString() : null,
          scheduledEndAt: inspection.scheduledEndAt ? inspection.scheduledEndAt.toISOString() : null,
        }}
        unitOptions={unitOptions}
        initialUnitLabel={unitLabel}
        // UNIT-OPS-1: Unit-owned (or hidden) linked Equipment pins the Unit.
        unitLockedByEquipment={Boolean(inspection.propertyEquipmentId) && (!equipment || equipment.propertyUnitId !== null)}
        categories={categories}
        users={users}
        timezone={timezone}
        canEdit={capabilityKeys.includes(INSPECTION_CAPABILITIES.EDIT)}
        canComplete={capabilityKeys.includes(INSPECTION_CAPABILITIES.COMPLETE)}
        canCreateWorkOrder={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)}
        canSchedule={capabilityKeys.includes(INSPECTION_CAPABILITIES.SCHEDULE)}
      />
    </div>
  );
}
