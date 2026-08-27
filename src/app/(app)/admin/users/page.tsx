import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";

export default async function AdminUsersPage() {
  await requireAdminCapability(ADMIN_CAPABILITIES.USERS);

  return (
    <div className="card">
      <h1>Users & Access</h1>
      <p className="muted">
        User management workflows are not built yet. This tile is a placeholder for a future
        phase.
      </p>
    </div>
  );
}
