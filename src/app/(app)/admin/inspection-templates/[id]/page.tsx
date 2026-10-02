import { InspectionTemplateDetailPanel } from "@/components/admin/InspectionTemplateDetailPanel";
import { BackLink } from "@/components/shared/BackLink";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { INSPECTION_TEMPLATE_CAPABILITIES } from "@/lib/inspections/constants";
import { GLOBAL_BACK_TARGETS } from "@/lib/navigation/back-links";

export default async function AdminInspectionTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminCapability(INSPECTION_TEMPLATE_CAPABILITIES.MANAGE);
  const { id } = await params;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <div className="page-title-row">
          <BackLink {...GLOBAL_BACK_TARGETS.adminInspectionTemplates} />
          <h1>Inspection Template</h1>
        </div>
        <p className="muted">Manage the ordered checklist for this template.</p>
      </div>
      <InspectionTemplateDetailPanel templateId={id} />
    </div>
  );
}
