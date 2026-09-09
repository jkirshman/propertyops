import Link from "next/link";

import { UserDetailPanel } from "@/components/admin/UserDetailPanel";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAdminCapability(ADMIN_CAPABILITIES.USERS);
  const { id } = await params;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <Link href="/admin/users" className="muted">
          ← Users & Access
        </Link>
        <h1>User</h1>
      </div>
      <UserDetailPanel userId={id} isSelf={context.user.id === id} />
    </div>
  );
}
