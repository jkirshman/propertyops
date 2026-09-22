import { redirect } from "next/navigation";

import { SubmitVendorForm } from "@/components/vendors/SubmitVendorForm";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";

// Gated on vendor.submit OR vendor.create (ACCESS-1) — requireCapability only
// checks a single capability, so this route checks both directly.
export default async function SubmitVendorPage() {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    redirect("/login");
  }
  if (
    !context.capabilityKeys.includes(VENDOR_CAPABILITIES.SUBMIT) &&
    !context.capabilityKeys.includes(VENDOR_CAPABILITIES.CREATE)
  ) {
    redirect("/vendors");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 800 }}>
      <div>
        <h1>Submit a Vendor</h1>
        <p className="muted">
          Suggest a vendor for a property you have access to. A Manager or Administrator will review it
          before it becomes available for use.
        </p>
      </div>
      <SubmitVendorForm />
    </div>
  );
}
