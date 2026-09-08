import { TenantsListPanel } from "@/components/tenants/TenantsListPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { TENANT_CAPABILITIES } from "@/lib/tenants/constants";

export default async function TenantsPage() {
  const context = await requireCapability(TENANT_CAPABILITIES.VIEW);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Tenants</h1>
        <p className="muted">Who occupies your properties, and how to reach them.</p>
      </div>
      <TenantsListPanel canCreate={context.capabilityKeys.includes(TENANT_CAPABILITIES.CREATE)} />
    </div>
  );
}
