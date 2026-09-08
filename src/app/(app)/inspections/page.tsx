import { InspectionsListPanel } from "@/components/inspections/InspectionsListPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";

export default async function InspectionsPage() {
  const context = await requireCapability(INSPECTION_CAPABILITIES.VIEW);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Inspections</h1>
        <p className="muted">Checklist-driven inspections across your portfolio.</p>
      </div>
      <InspectionsListPanel canCreate={context.capabilityKeys.includes(INSPECTION_CAPABILITIES.CREATE)} />
    </div>
  );
}
