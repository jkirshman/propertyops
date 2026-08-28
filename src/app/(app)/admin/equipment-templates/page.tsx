import { EquipmentTemplatesPanel } from "@/components/admin/EquipmentTemplatesPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { EQUIPMENT_TEMPLATE_CAPABILITIES } from "@/lib/equipment/constants";

export default async function AdminEquipmentTemplatesPage() {
  await requireAdminCapability(EQUIPMENT_TEMPLATE_CAPABILITIES.MANAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Equipment Templates</h1>
        <p className="muted">
          Define what equipment is normally expected for a class of property, then assign a
          template as a Property Type&apos;s default.
        </p>
      </div>
      <EquipmentTemplatesPanel />
    </div>
  );
}
