import Link from "next/link";

import { VendorPendingApprovalsPanel } from "@/components/vendors/VendorPendingApprovalsPanel";
import { VendorsListPanel } from "@/components/vendors/VendorsListPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";

export default async function VendorsPage() {
  const context = await requireCapability(VENDOR_CAPABILITIES.VIEW);
  const canCreate = context.capabilityKeys.includes(VENDOR_CAPABILITIES.CREATE);
  const canApprove = context.capabilityKeys.includes(VENDOR_CAPABILITIES.APPROVE);
  const canSubmit = context.capabilityKeys.includes(VENDOR_CAPABILITIES.SUBMIT);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1>Vendors</h1>
          <p className="muted">Who you use, what they service, and where they&apos;re approved to work.</p>
        </div>
        {canSubmit && !canCreate ? (
          <Link href="/vendors/submit" className="button button-primary">
            Submit a Vendor
          </Link>
        ) : null}
      </div>
      {canApprove ? <VendorPendingApprovalsPanel /> : null}
      <VendorsListPanel canCreate={canCreate} />
    </div>
  );
}
