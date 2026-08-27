import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";

export default async function AdminSystemPage() {
  await requireAdminCapability(ADMIN_CAPABILITIES.SYSTEM);

  return (
    <div className="card">
      <h1>System / Platform</h1>
      <p className="muted">
        Platform-level configuration and health tooling is not built yet. This tile is a
        placeholder for a future phase.
      </p>
    </div>
  );
}
