import { redirect } from "next/navigation";

import { NotificationPreferencesPanel } from "@/components/profile/NotificationPreferencesPanel";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRoleName } from "@/lib/auth/capabilities";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const roleName = await getRoleName(user.roleId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1>Profile</h1>

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Name</div>
          <div>{user.displayName}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Email</div>
          <div>{user.email}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Role</div>
          <div>{roleName ?? "Unknown"}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Notification Preferences</h2>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          Choose which categories notify you in-app and by email.
        </p>
        <NotificationPreferencesPanel />
      </div>
    </div>
  );
}
