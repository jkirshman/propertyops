"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/components/shell/LogoutButton";
import { isNavItemActive, type NavItem } from "@/lib/navigation/nav-items";

const PANEL_ID = "mobile-nav-panel";

/**
 * MOBILE-1: the narrow-viewport replacement for the desktop nav row. A
 * disclosure (button + panel), not a modal — it renders the exact navItems
 * AppHeader already resolved, plus Profile and Sign out. Notifications stay
 * in the header bar itself (the bell), which is visible at every width.
 * Hidden entirely above the mobile breakpoint via .app-mobile-only.
 */
export function MobileNavMenu({
  navItems,
  pathname,
  displayName,
  email,
}: {
  navItems: NavItem[];
  pathname: string;
  displayName: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Move focus into the panel so keyboard/screen-reader users land on the
    // first link rather than having to tab through the rest of the header.
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={containerRef} className="app-mobile-only">
      <button
        ref={buttonRef}
        type="button"
        className="button mobile-menu-button"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>
      <div ref={panelRef} id={PANEL_ID} className="mobile-nav-panel" hidden={!open}>
        <nav aria-label="Main">
          <ul className="mobile-nav-list">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="mobile-nav-link"
                  aria-current={isNavItemActive(pathname, item.href) ? "page" : undefined}
                  onClick={close}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mobile-nav-account">
          <Link
            href="/profile"
            className="mobile-nav-link"
            aria-current={isNavItemActive(pathname, "/profile") ? "page" : undefined}
            onClick={close}
          >
            <span style={{ display: "block", fontWeight: 600 }}>Profile</span>
            <span className="muted" style={{ display: "block", fontSize: "0.8rem", fontWeight: 400, overflowWrap: "anywhere" }}>
              {displayName} · {email}
            </span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
