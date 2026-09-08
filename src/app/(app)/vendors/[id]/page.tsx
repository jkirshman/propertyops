import { notFound } from "next/navigation";

import { VendorDetailPanel } from "@/components/vendors/VendorDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { getVendorWithCategories } from "@/lib/vendors/vendors";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(VENDOR_CAPABILITIES.VIEW, "/vendors");

  const vendor = await getVendorWithCategories(context.user.organizationId, id);
  if (!vendor) {
    notFound();
  }

  const { capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.3rem" }}>
            {vendor.name}
            {vendor.isPreferred ? " ★" : ""}
          </h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {vendor.categories.map((category) => category.name).join(", ") || "No services assigned"}
            {" · "}
            {[vendor.primaryPhone, vendor.primaryEmail].filter(Boolean).join(" · ") || "No contact info"}
            {!vendor.isActive ? " · Inactive" : ""}
          </div>
        </div>
      </div>

      <VendorDetailPanel
        initialVendor={{
          id: vendor.id,
          name: vendor.name,
          legalName: vendor.legalName,
          isActive: vendor.isActive,
          isPreferred: vendor.isPreferred,
          primaryPhone: vendor.primaryPhone,
          primaryEmail: vendor.primaryEmail,
          website: vendor.website,
          addressLine1: vendor.addressLine1,
          addressLine2: vendor.addressLine2,
          city: vendor.city,
          state: vendor.state,
          postalCode: vendor.postalCode,
          country: vendor.country,
          accountNumber: vendor.accountNumber,
          notes: vendor.notes,
          coverageMode: vendor.coverageMode,
          insuranceExpiresAt: vendor.insuranceExpiresAt,
          licenseExpiresAt: vendor.licenseExpiresAt,
          contractExpiresAt: vendor.contractExpiresAt,
          categories: vendor.categories,
        }}
        canEdit={capabilityKeys.includes(VENDOR_CAPABILITIES.EDIT)}
        canManageContacts={capabilityKeys.includes(VENDOR_CAPABILITIES.MANAGE_CONTACTS)}
        canManageCoverage={capabilityKeys.includes(VENDOR_CAPABILITIES.MANAGE_COVERAGE)}
        canManageDocuments={capabilityKeys.includes(VENDOR_CAPABILITIES.MANAGE_DOCUMENTS)}
      />
    </div>
  );
}
