import { PreventiveMaintenanceListPanel } from "@/components/preventive-maintenance/PreventiveMaintenanceListPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";

export default async function PreventiveMaintenancePage() {
  const context = await requireCapability(PREVENTIVE_MAINTENANCE_CAPABILITIES.VIEW);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Preventive Maintenance</h1>
        <p className="muted">Scheduled maintenance across your portfolio — what&apos;s due, overdue, and generated.</p>
      </div>
      <PreventiveMaintenanceListPanel
        canCreate={context.capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.CREATE)}
      />
    </div>
  );
}
