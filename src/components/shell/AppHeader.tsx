"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LogoutButton } from "@/components/shell/LogoutButton";
import { MobileNavMenu } from "@/components/shell/MobileNavMenu";
import { buildNavItems, isNavItemActive, type NavItemsInput } from "@/lib/navigation/nav-items";

export function AppHeader({
  displayName,
  email,
  ...navInput
}: {
  displayName: string;
  email: string;
} & NavItemsInput) {
  const pathname = usePathname();
  // One resolved list for both the desktop row and the mobile menu, so the
  // two can never disagree about what this user is allowed to see.
  const navItems = buildNavItems(navInput);

  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="app-header-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", minWidth: 0 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/propertyops-logo.png" alt="PropertyOps Hub" className="brand-logo" />
          </Link>
          <nav className="app-desktop-nav" aria-label="Main">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="app-nav-link"
                aria-current={isNavItemActive(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="app-header-actions">
          <NotificationBell />
          <div className="app-desktop-only" style={{ alignItems: "center", gap: "0.75rem" }}>
            <Link href="/profile" style={{ textAlign: "right", color: "inherit", textDecoration: "none" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{displayName}</div>
              <div className="muted" style={{ fontSize: "0.75rem" }}>
                {email}
              </div>
            </Link>
            <LogoutButton />
          </div>
          <MobileNavMenu navItems={navItems} pathname={pathname} displayName={displayName} email={email} />
        </div>
      </div>
    </header>
  );
}
