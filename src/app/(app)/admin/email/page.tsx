import { SendTestEmailButton } from "@/components/admin/SendTestEmailButton";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { getEmailConfigStatus } from "@/lib/email/email";

export default async function AdminEmailPage() {
  await requireAdminCapability(ADMIN_CAPABILITIES.EMAIL);
  const status = getEmailConfigStatus();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Email</h1>
        <p className="muted">
          Transactional email foundation (Resend-based), with a kill switch that defaults off.
        </p>
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div>
          Sending enabled: <strong>{status.enabled ? "Yes" : "No"}</strong>
        </div>
        <div>
          API key configured: <strong>{status.hasApiKey ? "Yes" : "No"}</strong>
        </div>
        <div>
          From address configured: <strong>{status.hasFromAddress ? "Yes" : "No"}</strong>
        </div>
      </div>
      <SendTestEmailButton />
    </div>
  );
}
