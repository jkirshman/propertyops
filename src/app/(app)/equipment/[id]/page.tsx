import Link from "next/link";
import { notFound } from "next/navigation";

import { EquipmentDetailPanel } from "@/components/equipment/EquipmentDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { getEquipmentCatalogItem } from "@/lib/equipment/catalog";
import {
  EQUIPMENT_CAPABILITIES,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentCondition,
  type EquipmentStatus,
} from "@/lib/equipment/constants";
import { canAccessPropertyEquipment } from "@/lib/equipment/equipment-access";
import { getEquipmentUnitOptions, getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { formatEquipmentUnitLabel } from "@/lib/equipment/unit-display";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { getProperty } from "@/lib/properties/properties";
import { canUploadEntityPhoto } from "@/lib/property-photos/photo-rules";
import { getPropertyUnit } from "@/lib/property-units/property-units";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";

export default async function PropertyEquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(EQUIPMENT_CAPABILITIES.VIEW, "/properties");

  const equipment = await getPropertyEquipment(context.user.organizationId, id);
  if (!equipment) {
    notFound();
  }

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  // UNIT-EQUIP-1: another Unit's Equipment is "not found", exactly like
  // another Property's — the URL reveals nothing.
  if (!canAccessPropertyEquipment(scope, equipment)) {
    notFound();
  }

  const { capabilityKeys } = context;
  const canEdit = capabilityKeys.includes(EQUIPMENT_CAPABILITIES.EDIT);

  const [property, catalogItem, unit] = await Promise.all([
    getProperty(context.user.organizationId, equipment.propertyId),
    getEquipmentCatalogItem(context.user.organizationId, equipment.equipmentCatalogItemId),
    equipment.propertyUnitId
      ? getPropertyUnit(context.user.organizationId, equipment.propertyId, equipment.propertyUnitId)
      : Promise.resolve(null),
  ]);
  const unitOptions =
    canEdit && property ? await getEquipmentUnitOptions(context.user.organizationId, property, scope) : null;
  const unitFields = {
    propertyUnitId: equipment.propertyUnitId,
    unitLabel: unit?.unitLabel ?? null,
    unitIsActive: unit?.isActive ?? null,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {catalogItem?.name ?? "Unknown equipment type"}
          </div>
          <h1 style={{ marginBottom: "0.3rem" }}>{equipment.displayName}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {property ? <Link href={`/properties/${property.id}`} className="text-link">{property.name}</Link> : "Unknown property"}
            {" · "}
            {formatEquipmentUnitLabel(unitFields)}
            {" · "}
            {EQUIPMENT_STATUS_LABELS[equipment.status as EquipmentStatus] ?? equipment.status}
            {" · "}
            {EQUIPMENT_CONDITION_LABELS[equipment.condition as EquipmentCondition] ?? equipment.condition}
          </div>
        </div>
      </div>

      <EquipmentDetailPanel
        initialEquipment={{
          id: equipment.id,
          displayName: equipment.displayName,
          equipmentTag: equipment.equipmentTag,
          manufacturer: equipment.manufacturer,
          model: equipment.model,
          serialNumber: equipment.serialNumber,
          locationInProperty: equipment.locationInProperty,
          installedDate: equipment.installedDate,
          status: equipment.status,
          condition: equipment.condition,
          isActive: equipment.isActive,
          notes: equipment.notes,
          ...unitFields,
        }}
        propertyName={property?.name ?? null}
        unitOptions={unitOptions}
        canEdit={canEdit}
        canManageService={capabilityKeys.includes(EQUIPMENT_CAPABILITIES.MANAGE_SERVICE)}
        canManageDocuments={capabilityKeys.includes(EQUIPMENT_CAPABILITIES.MANAGE_DOCUMENTS)}
        canUploadPhotos={canUploadEntityPhoto(capabilityKeys, "equipment")}
        canCreateWorkOrders={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)}
        canCreatePreventiveMaintenance={capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.CREATE)}
        canCreateInspections={capabilityKeys.includes(INSPECTION_CAPABILITIES.CREATE)}
      />
    </div>
  );
}
