import { LeaseForm } from "@/components/leases/LeaseForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { listAccessiblePropertyIds, resolveUserPropertyScope } from "@/lib/auth/property-access";
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

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  const accessiblePropertyIds = listAccessiblePropertyIds(scope);

  // Existing Tenants remain selectable regardless of scope — attaching an
  // already-existing Tenant to a new Lease at an accessible Property is
  // exactly how that Tenant becomes visible to a scoped user; the property
  // side (not the tenant side) is where this form's access boundary lives.
  const [allProperties, tenants] = await Promise.all([
    listProperties(context.user.organizationId, { isActive: true }),
    listTenants(context.user.organizationId, { isActive: true }),
  ]);
  const properties =
    accessiblePropertyIds === null
      ? allProperties
      : allProperties.filter((property) => accessiblePropertyIds.includes(property.id));

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
