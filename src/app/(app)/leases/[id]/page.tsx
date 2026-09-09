import { notFound } from "next/navigation";

import { LeaseDetailPanel } from "@/components/leases/LeaseDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { getLease } from "@/lib/leases/leases";
import { getProperty } from "@/lib/properties/properties";
import { getPropertyUnit } from "@/lib/property-units/property-units";
import { getTenant } from "@/lib/tenants/tenants";

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(LEASE_CAPABILITIES.VIEW, "/leases");

  const lease = await getLease(context.user.organizationId, id);
  if (!lease) {
    notFound();
  }

  const [property, tenant, unit] = await Promise.all([
    getProperty(context.user.organizationId, lease.propertyId),
    getTenant(context.user.organizationId, lease.tenantId),
    lease.propertyUnitId
      ? getPropertyUnit(context.user.organizationId, lease.propertyId, lease.propertyUnitId)
      : Promise.resolve(null),
  ]);

  const { capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card">
        <h1 style={{ marginBottom: "0.3rem" }}>{lease.label}</h1>
        <div className="muted" style={{ fontSize: "0.9rem" }}>
          {property?.name ?? "Unknown property"} · {tenant?.name ?? "Unknown tenant"}
        </div>
      </div>

      <LeaseDetailPanel
        initialLease={lease}
        propertyName={property?.name ?? "Unknown property"}
        tenantName={tenant?.name ?? "Unknown tenant"}
        unitRecordLabel={unit?.unitLabel ?? null}
        canEdit={capabilityKeys.includes(LEASE_CAPABILITIES.EDIT)}
        canManageStatus={capabilityKeys.includes(LEASE_CAPABILITIES.MANAGE_STATUS)}
        canManageDocuments={capabilityKeys.includes(LEASE_CAPABILITIES.MANAGE_DOCUMENTS)}
      />
    </div>
  );
}
