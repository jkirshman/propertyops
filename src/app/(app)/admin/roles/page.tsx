import { RolesPanel } from "@/components/admin/RolesPanel";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";

export default async function AdminRolesPage() {
  await requireAdminCapability(ADMIN_CAPABILITIES.ROLES);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Roles & Capabilities</h1>
        <p className="muted">Inspect each role&apos;s granted capabilities.</p>
      </div>
      <RolesPanel />
    </div>
  );
}
