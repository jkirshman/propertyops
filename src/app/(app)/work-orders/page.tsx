import { WorkOrdersListPanel } from "@/components/work-orders/WorkOrdersListPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";

export default async function WorkOrdersPage() {
  const context = await requireCapability(WORK_ORDER_CAPABILITIES.VIEW);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Work Orders</h1>
        <p className="muted">Track and manage maintenance requests across your portfolio.</p>
      </div>
      <WorkOrdersListPanel canCreate={context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)} />
    </div>
  );
}
