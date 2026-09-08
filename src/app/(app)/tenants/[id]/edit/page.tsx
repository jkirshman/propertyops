import { notFound } from "next/navigation";

import { TenantForm, type TenantFormValues } from "@/components/tenants/TenantForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { TENANT_CAPABILITIES } from "@/lib/tenants/constants";
import { getTenant } from "@/lib/tenants/tenants";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(TENANT_CAPABILITIES.EDIT, `/tenants/${id}`);

  const tenant = await getTenant(context.user.organizationId, id);
  if (!tenant) {
    notFound();
  }

  const initialValues: Partial<TenantFormValues> = {
    tenantType: tenant.tenantType as TenantFormValues["tenantType"],
    name: tenant.name,
    legalName: tenant.legalName ?? "",
    primaryPhone: tenant.primaryPhone ?? "",
    primaryEmail: tenant.primaryEmail ?? "",
    website: tenant.website ?? "",
    addressLine1: tenant.addressLine1 ?? "",
    addressLine2: tenant.addressLine2 ?? "",
    city: tenant.city ?? "",
    state: tenant.state ?? "",
    postalCode: tenant.postalCode ?? "",
    country: tenant.country ?? "",
    notes: tenant.notes ?? "",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>Edit {tenant.name}</h1>
      </div>
      <TenantForm mode="edit" tenantId={tenant.id} initialValues={initialValues} />
    </div>
  );
}
