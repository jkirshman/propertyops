"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LogoutButton } from "@/components/shell/LogoutButton";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link href={href} className="app-nav-link" aria-current={isActive ? "page" : undefined}>
      {children}
    </Link>
  );
}

export function AppHeader({
  displayName,
  email,
  showAdminLink,
  showPropertiesLink,
  showWorkOrdersLink,
  showAssetsLink,
  showPeopleLink,
}: {
  displayName: string;
  email: string;
  showAdminLink: boolean;
  showPropertiesLink: boolean;
  showWorkOrdersLink: boolean;
  showAssetsLink: boolean;
  showPeopleLink: boolean;
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
          padding: "0.75rem 1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/propertyops-logo.png" alt="PropertyOps Hub" className="brand-logo" />
          </Link>
          <nav style={{ display: "flex", gap: "1.1rem" }}>
            <NavLink href="/">Home</NavLink>
            {showPropertiesLink ? <NavLink href="/properties">Properties</NavLink> : null}
            {showWorkOrdersLink ? <NavLink href="/work-orders">Work Orders</NavLink> : null}
            {showAssetsLink ? <NavLink href="/assets">Assets</NavLink> : null}
            {showPeopleLink ? <NavLink href="/people">People</NavLink> : null}
            {showAdminLink ? <NavLink href="/admin">Admin Hub</NavLink> : null}
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
