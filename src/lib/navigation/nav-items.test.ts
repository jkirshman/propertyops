import { describe, expect, it } from "vitest";

import { buildNavItems, isNavItemActive, type NavItemsInput } from "./nav-items";

const ALL_LINKS: NavItemsInput = {
  navVariant: "admin",
  myPropertyHref: "/properties",
  showAdminLink: true,
  showCalendarLink: true,
  showPropertiesLink: true,
  showWorkOrdersLink: true,
  showPreventiveMaintenanceLink: true,
  showInspectionsLink: true,
  showVendorsLink: true,
  showTenantsLink: true,
  showAssetsLink: true,
};

const NO_LINKS: NavItemsInput = {
  ...ALL_LINKS,
  showAdminLink: false,
  showCalendarLink: false,
  showPropertiesLink: false,
  showWorkOrdersLink: false,
  showPreventiveMaintenanceLink: false,
  showInspectionsLink: false,
  showVendorsLink: false,
  showTenantsLink: false,
  showAssetsLink: false,
};

const labels = (input: NavItemsInput) => buildNavItems(input).map((item) => item.label);

describe("buildNavItems", () => {
  it("gives an Admin every capability-granted link, ending with Admin Hub", () => {
    expect(labels(ALL_LINKS)).toEqual([
      "Home",
      "Calendar",
      "Properties",
      "Work Orders",
      "Preventive Maintenance",
      "Inspections",
      "Vendors",
      "Tenants",
      "Assets",
      "Admin Hub",
    ]);
  });

  it("omits links whose capability is missing (e.g. a Manager without Admin Hub)", () => {
    expect(
      labels({ ...NO_LINKS, navVariant: "manager", showPropertiesLink: true, showWorkOrdersLink: true }),
    ).toEqual(["Home", "Properties", "Work Orders"]);
  });

  it("gives a User the simplified Home / My Property / Work Orders nav", () => {
    const items = buildNavItems({
      ...ALL_LINKS,
      navVariant: "user",
      myPropertyHref: "/properties/abc",
    });
    expect(items).toEqual([
      { href: "/", label: "Home" },
      { href: "/properties/abc", label: "My Property" },
      { href: "/work-orders", label: "Work Orders" },
    ]);
  });

  it("never shows a User the Admin Hub or module links, even if flags are set", () => {
    expect(labels({ ...ALL_LINKS, navVariant: "user" })).not.toContain("Admin Hub");
    expect(labels({ ...ALL_LINKS, navVariant: "user" })).not.toContain("Vendors");
  });

  it("drops Work Orders for a User without work_order.view", () => {
    expect(labels({ ...NO_LINKS, navVariant: "user" })).toEqual(["Home", "My Property"]);
  });
});

describe("isNavItemActive", () => {
  it("only marks Home active on the root path", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/properties", "/")).toBe(false);
  });

  it("marks a section active on its nested pages", () => {
    expect(isNavItemActive("/work-orders/123", "/work-orders")).toBe(true);
    expect(isNavItemActive("/vendors", "/work-orders")).toBe(false);
  });
});
