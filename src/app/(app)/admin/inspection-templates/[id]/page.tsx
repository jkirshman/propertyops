import { InspectionTemplateDetailPanel } from "@/components/admin/InspectionTemplateDetailPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { INSPECTION_TEMPLATE_CAPABILITIES } from "@/lib/inspections/constants";

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
        <h1>Inspection Template</h1>
        <p className="muted">Manage the ordered checklist for this template.</p>
      </div>
      <InspectionTemplateDetailPanel templateId={id} />
    </div>
  );
}
