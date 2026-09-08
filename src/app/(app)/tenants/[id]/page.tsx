import { notFound } from "next/navigation";

import { TenantDetailPanel } from "@/components/tenants/TenantDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { TENANT_CAPABILITIES } from "@/lib/tenants/constants";
import { getTenant } from "@/lib/tenants/tenants";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(TENANT_CAPABILITIES.VIEW, "/tenants");

  const tenant = await getTenant(context.user.organizationId, id);
  if (!tenant) {
    notFound();
  }

  const { capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.3rem" }}>{tenant.name}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {[tenant.primaryPhone, tenant.primaryEmail].filter(Boolean).join(" · ") || "No contact info"}
            {!tenant.isActive ? " · Inactive" : ""}
          </div>
        </div>
      </div>

      <TenantDetailPanel
        initialTenant={tenant}
        canEdit={capabilityKeys.includes(TENANT_CAPABILITIES.EDIT)}
        canManageContacts={capabilityKeys.includes(TENANT_CAPABILITIES.MANAGE_CONTACTS)}
        canManageDocuments={capabilityKeys.includes(TENANT_CAPABILITIES.MANAGE_DOCUMENTS)}
        canCreateLeases={capabilityKeys.includes(LEASE_CAPABILITIES.CREATE)}
      />
    </div>
  );
}
