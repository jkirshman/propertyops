import { VendorsListPanel } from "@/components/vendors/VendorsListPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";

export default async function VendorsPage() {
  const context = await requireCapability(VENDOR_CAPABILITIES.VIEW);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Vendors</h1>
        <p className="muted">Who you use, what they service, and where they&apos;re approved to work.</p>
      </div>
      <VendorsListPanel canCreate={context.capabilityKeys.includes(VENDOR_CAPABILITIES.CREATE)} />
    </div>
  );
}
