import { LeasesListPanel } from "@/components/leases/LeasesListPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; tenantId?: string }>;
}) {
  const context = await requireCapability(LEASE_CAPABILITIES.VIEW);
  const { propertyId, tenantId } = await searchParams;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Leases</h1>
        <p className="muted">Every lease across your portfolio — dates, status, and expiration risk at a glance.</p>
      </div>
      <LeasesListPanel
        canCreate={context.capabilityKeys.includes(LEASE_CAPABILITIES.CREATE)}
        initialPropertyId={propertyId}
        initialTenantId={tenantId}
      />
    </div>
  );
}
