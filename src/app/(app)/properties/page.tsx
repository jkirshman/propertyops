import { PropertiesListPanel } from "@/components/properties/PropertiesListPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";

export default async function PropertiesPage() {
  const context = await requireCapability(PROPERTY_CAPABILITIES.VIEW);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Properties</h1>
        <p className="muted">Search and manage the properties in your portfolio.</p>
      </div>
      <PropertiesListPanel canCreate={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.CREATE)} />
    </div>
  );
}
