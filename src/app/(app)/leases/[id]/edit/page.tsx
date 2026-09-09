import { notFound } from "next/navigation";

import { LeaseForm, type LeaseFormValues } from "@/components/leases/LeaseForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { getLease } from "@/lib/leases/leases";
import { getProperty } from "@/lib/properties/properties";
import { getTenant } from "@/lib/tenants/tenants";

export default async function EditLeasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(LEASE_CAPABILITIES.EDIT, `/leases/${id}`);

  const lease = await getLease(context.user.organizationId, id);
  if (!lease) {
    notFound();
  }

  const [property, tenant] = await Promise.all([
    getProperty(context.user.organizationId, lease.propertyId),
    getTenant(context.user.organizationId, lease.tenantId),
  ]);

  const initialValues: Partial<LeaseFormValues> = {
    propertyId: lease.propertyId,
    tenantId: lease.tenantId,
    label: lease.label,
    leaseType: lease.leaseType as LeaseFormValues["leaseType"],
    status: lease.status as LeaseFormValues["status"],
    startDate: lease.startDate,
    endDate: lease.endDate ?? "",
    noticeDate: lease.noticeDate ?? "",
    renewalOptionDate: lease.renewalOptionDate ?? "",
    moveInDate: lease.moveInDate ?? "",
    moveOutDate: lease.moveOutDate ?? "",
    securityDeposit: lease.securityDeposit != null ? String(lease.securityDeposit) : "",
    baseRent: lease.baseRent != null ? String(lease.baseRent) : "",
    rentFrequency: (lease.rentFrequency as LeaseFormValues["rentFrequency"]) ?? "",
    squareFootageLeased: lease.squareFootageLeased != null ? String(lease.squareFootageLeased) : "",
    unitLabel: lease.unitLabel ?? "",
    propertyUnitId: lease.propertyUnitId ?? "",
    notes: lease.notes ?? "",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 900 }}>
      <div>
        <h1>Edit {lease.label}</h1>
      </div>
      <LeaseForm
        mode="edit"
        leaseId={lease.id}
        properties={property ? [property] : []}
        tenants={tenant ? [tenant] : []}
        initialValues={initialValues}
      />
    </div>
  );
}
