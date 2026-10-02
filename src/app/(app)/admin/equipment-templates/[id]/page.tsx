import { EquipmentTemplateDetailPanel } from "@/components/admin/EquipmentTemplateDetailPanel";
import { BackLink } from "@/components/shared/BackLink";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { EQUIPMENT_TEMPLATE_CAPABILITIES } from "@/lib/equipment/constants";
import { GLOBAL_BACK_TARGETS } from "@/lib/navigation/back-links";

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
        <div className="page-title-row">
          <BackLink {...GLOBAL_BACK_TARGETS.adminEquipmentTemplates} />
          <h1>Equipment Template</h1>
        </div>
        <p className="muted">Manage the ordered list of equipment expected under this template.</p>
      </div>
      <EquipmentTemplateDetailPanel templateId={id} />
    </div>
  );
}
