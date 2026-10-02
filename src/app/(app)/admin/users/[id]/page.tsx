import { UserDetailPanel } from "@/components/admin/UserDetailPanel";
import { BackLink } from "@/components/shared/BackLink";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { GLOBAL_BACK_TARGETS } from "@/lib/navigation/back-links";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAdminCapability(ADMIN_CAPABILITIES.USERS);
  const { id } = await params;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <div className="page-title-row">
          <BackLink {...GLOBAL_BACK_TARGETS.adminUsers} />
          <h1>User</h1>
        </div>
      </div>
      <UserDetailPanel userId={id} isSelf={context.user.id === id} />
    </div>
  );
}
