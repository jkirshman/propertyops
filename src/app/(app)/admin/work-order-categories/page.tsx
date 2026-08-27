import { WorkOrderCategoriesPanel } from "@/components/admin/WorkOrderCategoriesPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { WORK_ORDER_CATEGORY_CAPABILITIES } from "@/lib/work-orders/constants";

export default async function AdminWorkOrderCategoriesPage() {
  await requireAdminCapability(WORK_ORDER_CATEGORY_CAPABILITIES.MANAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Work Order Categories</h1>
        <p className="muted">The category taxonomy used when creating and filtering work orders.</p>
      </div>
      <WorkOrderCategoriesPanel />
    </div>
  );
}
