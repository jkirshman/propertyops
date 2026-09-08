import { InspectionTemplatesPanel } from "@/components/admin/InspectionTemplatesPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { INSPECTION_TEMPLATE_CAPABILITIES } from "@/lib/inspections/constants";

export default async function AdminInspectionTemplatesPage() {
  await requireAdminCapability(INSPECTION_TEMPLATE_CAPABILITIES.MANAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Inspection Templates</h1>
        <p className="muted">Define reusable checklists staff run against Properties and Equipment.</p>
      </div>
      <InspectionTemplatesPanel />
    </div>
  );
}
