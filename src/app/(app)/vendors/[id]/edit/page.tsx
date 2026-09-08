import { notFound } from "next/navigation";

import { VendorForm, type VendorFormValues } from "@/components/vendors/VendorForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { getVendorWithCategories } from "@/lib/vendors/vendors";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(VENDOR_CAPABILITIES.EDIT, `/vendors/${id}`);

  const vendor = await getVendorWithCategories(context.user.organizationId, id);
  if (!vendor) {
    notFound();
  }

  const initialValues: Partial<VendorFormValues> = {
    name: vendor.name,
    legalName: vendor.legalName ?? "",
    isPreferred: vendor.isPreferred,
    primaryPhone: vendor.primaryPhone ?? "",
    primaryEmail: vendor.primaryEmail ?? "",
    website: vendor.website ?? "",
    addressLine1: vendor.addressLine1 ?? "",
    addressLine2: vendor.addressLine2 ?? "",
    city: vendor.city ?? "",
    state: vendor.state ?? "",
    postalCode: vendor.postalCode ?? "",
    country: vendor.country ?? "",
    accountNumber: vendor.accountNumber ?? "",
    notes: vendor.notes ?? "",
    coverageMode: vendor.coverageMode,
    insuranceExpiresAt: vendor.insuranceExpiresAt ?? "",
    licenseExpiresAt: vendor.licenseExpiresAt ?? "",
    contractExpiresAt: vendor.contractExpiresAt ?? "",
    categoryIds: vendor.categories.map((category) => category.id),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>Edit {vendor.name}</h1>
      </div>
      <VendorForm mode="edit" vendorId={vendor.id} initialValues={initialValues} />
    </div>
  );
}
