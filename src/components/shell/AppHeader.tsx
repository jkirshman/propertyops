import Link from "next/link";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LogoutButton } from "@/components/shell/LogoutButton";

export function AppHeader({
  displayName,
  email,
  showAdminLink,
  showPropertiesLink,
}: {
  displayName: string;
  email: string;
  showAdminLink: boolean;
  showPropertiesLink: boolean;
}) {
  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0.9rem 1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: "1.05rem" }}>
            PropertyOps Hub
          </Link>
          <nav style={{ display: "flex", gap: "1rem" }}>
            <Link href="/" className="muted">
              Home
            </Link>
            {showPropertiesLink ? (
              <Link href="/properties" className="muted">
                Properties
              </Link>
            ) : null}
            {showAdminLink ? (
              <Link href="/admin" className="muted">
                Admin Hub
              </Link>
            ) : null}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <NotificationBell />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{displayName}</div>
            <div className="muted" style={{ fontSize: "0.75rem" }}>
              {email}
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
