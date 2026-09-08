import { VendorForm } from "@/components/vendors/VendorForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";

export default async function NewVendorPage() {
  await requireCapability(VENDOR_CAPABILITIES.CREATE, "/vendors");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>New Vendor</h1>
        <p className="muted">Add a vendor to the directory.</p>
      </div>
      <VendorForm mode="create" />
    </div>
  );
}
