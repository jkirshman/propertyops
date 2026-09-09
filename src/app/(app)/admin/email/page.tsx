import { EmailSendHistoryPanel } from "@/components/admin/EmailSendHistoryPanel";
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
        <div>
          App base URL configured: <strong>{status.hasAppBaseUrl ? "Yes" : "No"}</strong>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.35rem" }}>
          The <code>EMAIL_ENABLED</code> kill switch is controlled by this deployment&apos;s environment
          configuration, not by this page — it cannot be toggled here. Change it in Vercel project
          environment variables and redeploy to take effect.
        </p>
      </div>
      <SendTestEmailButton />
      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Send history</h2>
        <EmailSendHistoryPanel />
      </div>
    </div>
  );
}
