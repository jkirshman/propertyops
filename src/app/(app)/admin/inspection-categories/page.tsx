import { InspectionCategoriesPanel } from "@/components/admin/InspectionCategoriesPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { INSPECTION_TEMPLATE_CAPABILITIES } from "@/lib/inspections/constants";

export default async function AdminInspectionCategoriesPage() {
  await requireAdminCapability(INSPECTION_TEMPLATE_CAPABILITIES.MANAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Inspection Categories</h1>
        <p className="muted">The category taxonomy used to organize Inspection Templates.</p>
      </div>
      <InspectionCategoriesPanel />
    </div>
  );
}
