import { LeaseForm } from "@/components/leases/LeaseForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { listProperties } from "@/lib/properties/properties";
import { listTenants } from "@/lib/tenants/tenants";

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; tenantId?: string }>;
}) {
  const context = await requireCapability(LEASE_CAPABILITIES.CREATE, "/leases");
  const { propertyId, tenantId } = await searchParams;

  const [properties, tenants] = await Promise.all([
    listProperties(context.user.organizationId, { isActive: true }),
    listTenants(context.user.organizationId, { isActive: true }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 900 }}>
      <div>
        <h1>New Lease</h1>
        <p className="muted">Create the lease that ties a tenant to a property.</p>
      </div>
      <LeaseForm
        mode="create"
        properties={properties}
        tenants={tenants}
        initialValues={{ propertyId, tenantId }}
      />
    </div>
  );
}
