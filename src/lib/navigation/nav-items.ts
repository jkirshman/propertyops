import type { NavVariant } from "@/lib/navigation/nav-visibility";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavItemsInput {
  navVariant: NavVariant;
  myPropertyHref: string;
  showAdminLink: boolean;
  showCalendarLink: boolean;
  showPropertiesLink: boolean;
  showWorkOrdersLink: boolean;
  showPreventiveMaintenanceLink: boolean;
  showInspectionsLink: boolean;
  showVendorsLink: boolean;
  showTenantsLink: boolean;
  showAssetsLink: boolean;
}

/**
 * The single resolved list of top-level nav links for the current user. The
 * desktop nav row and the mobile menu both render from this — MOBILE-1 must
 * not grow a second copy of the capability/variant rules.
 *
 * ACCESS-1: "user" gets the simplified Home/My Property/Work Orders nav
 * instead of the full capability-gated link set — a User keeps every other
 * module reachable as tabs inside their Property detail page, just not as
 * top-level nav.
 */
export function buildNavItems(input: NavItemsInput): NavItem[] {
  const items: NavItem[] = [{ href: "/", label: "Home" }];

  if (input.navVariant === "user") {
    items.push({ href: input.myPropertyHref, label: "My Property" });
    if (input.showWorkOrdersLink) items.push({ href: "/work-orders", label: "Work Orders" });
    return items;
  }

  if (input.showCalendarLink) items.push({ href: "/calendar", label: "Calendar" });
  if (input.showPropertiesLink) items.push({ href: "/properties", label: "Properties" });
  if (input.showWorkOrdersLink) items.push({ href: "/work-orders", label: "Work Orders" });
  if (input.showPreventiveMaintenanceLink) {
    items.push({ href: "/preventive-maintenance", label: "Preventive Maintenance" });
  }
  if (input.showInspectionsLink) items.push({ href: "/inspections", label: "Inspections" });
  if (input.showVendorsLink) items.push({ href: "/vendors", label: "Vendors" });
  if (input.showTenantsLink) items.push({ href: "/tenants", label: "Tenants" });
  if (input.showAssetsLink) items.push({ href: "/assets", label: "Assets" });
  if (input.showAdminLink) items.push({ href: "/admin", label: "Admin Hub" });
  return items;
}

/** Same active-link rule the desktop nav has always used. */
export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
