import Link from "next/link";
import { notFound } from "next/navigation";

import { EquipmentDetailPanel } from "@/components/equipment/EquipmentDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { getEquipmentCatalogItem } from "@/lib/equipment/catalog";
import {
  EQUIPMENT_CAPABILITIES,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentCondition,
  type EquipmentStatus,
} from "@/lib/equipment/constants";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { getProperty } from "@/lib/properties/properties";
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

  const [property, catalogItem] = await Promise.all([
    getProperty(context.user.organizationId, equipment.propertyId),
    getEquipmentCatalogItem(context.user.organizationId, equipment.equipmentCatalogItemId),
  ]);

  const { capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {catalogItem?.name ?? "Unknown equipment type"}
          </div>
          <h1 style={{ marginBottom: "0.3rem" }}>{equipment.displayName}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {property ? <Link href={`/properties/${property.id}`}>{property.name}</Link> : "Unknown property"}
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
        }}
        canEdit={capabilityKeys.includes(EQUIPMENT_CAPABILITIES.EDIT)}
        canManageService={capabilityKeys.includes(EQUIPMENT_CAPABILITIES.MANAGE_SERVICE)}
        canManageDocuments={capabilityKeys.includes(EQUIPMENT_CAPABILITIES.MANAGE_DOCUMENTS)}
        canCreateWorkOrders={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)}
      />
    </div>
  );
}
