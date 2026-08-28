import { EquipmentTemplateDetailPanel } from "@/components/admin/EquipmentTemplateDetailPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { EQUIPMENT_TEMPLATE_CAPABILITIES } from "@/lib/equipment/constants";

export default async function AdminEquipmentTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminCapability(EQUIPMENT_TEMPLATE_CAPABILITIES.MANAGE);
  const { id } = await params;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Equipment Template</h1>
        <p className="muted">Manage the ordered list of equipment expected under this template.</p>
      </div>
      <EquipmentTemplateDetailPanel templateId={id} />
    </div>
  );
}
