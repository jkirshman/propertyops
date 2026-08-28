import { EquipmentCatalogPanel } from "@/components/admin/EquipmentCatalogPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { EQUIPMENT_CATALOG_CAPABILITIES } from "@/lib/equipment/constants";

export default async function AdminEquipmentCatalogPage() {
  await requireAdminCapability(EQUIPMENT_CATALOG_CAPABILITIES.MANAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Equipment Catalog</h1>
        <p className="muted">
          Reusable equipment kinds that can appear in templates and become actual installed
          equipment at a property.
        </p>
      </div>
      <EquipmentCatalogPanel />
    </div>
  );
}
