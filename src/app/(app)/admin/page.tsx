import { redirect } from "next/navigation";

import { AdminHubGrid } from "@/components/admin/AdminHubGrid";
import { ADMIN_TILE_GROUPS, visibleAdminTiles } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";

export default async function AdminHubPage() {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    redirect("/login");
  }

  const tiles = visibleAdminTiles(context.capabilityKeys);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Admin Hub</h1>
        <p className="muted">Platform administration tools.</p>
      </div>
      <AdminHubGrid tiles={tiles} groups={ADMIN_TILE_GROUPS} />
    </div>
  );
}
