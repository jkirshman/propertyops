import { TenantForm } from "@/components/tenants/TenantForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { TENANT_CAPABILITIES } from "@/lib/tenants/constants";

export default async function NewTenantPage() {
  await requireCapability(TENANT_CAPABILITIES.CREATE, "/tenants");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>New Tenant</h1>
        <p className="muted">Add a tenant to the directory.</p>
      </div>
      <TenantForm mode="create" />
    </div>
  );
}
