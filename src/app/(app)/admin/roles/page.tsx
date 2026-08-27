import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";

export default async function AdminRolesPage() {
  await requireAdminCapability(ADMIN_CAPABILITIES.ROLES);

  return (
    <div className="card">
      <h1>Roles & Capabilities</h1>
      <p className="muted">
        Role and capability management workflows are not built yet. This tile is a placeholder
        for a future phase.
      </p>
    </div>
  );
}
