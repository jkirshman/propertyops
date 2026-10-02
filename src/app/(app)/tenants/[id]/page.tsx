import { notFound } from "next/navigation";

import { TenantDetailPanel } from "@/components/tenants/TenantDetailPanel";
import { BackLink } from "@/components/shared/BackLink";
import { requireCapability } from "@/lib/auth/require-capability";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { listLeases } from "@/lib/leases/leases";
import { parseFromProperty, tenantBackTarget } from "@/lib/navigation/back-links";
import { TENANT_CAPABILITIES } from "@/lib/tenants/constants";
import { getTenant, tenantHasAccessibleLease } from "@/lib/tenants/tenants";

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromProperty?: string | string[] }>;
}) {
  const { id } = await params;
  const { fromProperty } = await searchParams;
  const context = await requireCapability(TENANT_CAPABILITIES.VIEW, "/tenants");

  const tenant = await getTenant(context.user.organizationId, id);
  if (!tenant) {
    notFound();
  }

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  if (scope.kind !== "all" && !(await tenantHasAccessibleLease(context.user.organizationId, id, scope))) {
    notFound();
  }

  const { capabilityKeys } = context;
  // NAV-1: only Leases this viewer can already see decide the back arrow's Property.
  const accessibleLeases = await listLeases(context.user.organizationId, { tenantId: id, scope });
  const backTarget = tenantBackTarget(
    accessibleLeases.map((lease) => lease.propertyId),
    parseFromProperty(fromProperty),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="page-title-row">
            <BackLink {...backTarget} />
            <h1 style={{ marginBottom: "0.3rem" }}>{tenant.name}</h1>
          </div>
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
