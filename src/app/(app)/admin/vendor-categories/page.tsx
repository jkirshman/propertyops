import { VendorCategoriesPanel } from "@/components/admin/VendorCategoriesPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { VENDOR_CATEGORY_CAPABILITIES } from "@/lib/vendors/constants";

export default async function AdminVendorCategoriesPage() {
  await requireAdminCapability(VENDOR_CATEGORY_CAPABILITIES.MANAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Vendor Categories</h1>
        <p className="muted">The service-category taxonomy used to tag Vendors across PropertyOps.</p>
      </div>
      <VendorCategoriesPanel />
    </div>
  );
}
