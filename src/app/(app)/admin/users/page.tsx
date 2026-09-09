import { UsersPanel } from "@/components/admin/UsersPanel";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";

export default async function AdminUsersPage() {
  await requireAdminCapability(ADMIN_CAPABILITIES.USERS);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Users & Access</h1>
        <p className="muted">Invite users, assign roles, and manage account status.</p>
      </div>
      <UsersPanel />
    </div>
  );
}
