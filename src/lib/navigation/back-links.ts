import type { Tab } from "@/lib/properties/property-profile-tabs";

// NAV-1: where a detail page's back arrow goes. The arrow means "up one level
// in the PropertyOps hierarchy", not browser history — a deep link, refreshed
// page, or new tab must still land somewhere useful inside the app.
//
// The only origin context is `fromProperty`: a Property id (never a URL) that
// a Property tab adds to its record links. It is honored only when it names
// the record's own Property (or, for a Tenant, a Property the viewer can see
// a Lease for), so the destination is always built here from known data and
// can never point outside the app.

export const FROM_PROPERTY_PARAM = "fromProperty";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads `?fromProperty=`; anything other than a single well-formed id is ignored. */
export function parseFromProperty(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : undefined;
}

/** A record link from inside a Property tab, tagged so its back arrow returns to that tab. */
export function withFromProperty(href: string, propertyId: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}${FROM_PROPERTY_PARAM}=${encodeURIComponent(propertyId)}`;
}

export interface BackTarget {
  href: string;
  /** Accessible name for the icon-only arrow. */
  label: string;
}

const PROPERTY_TAB_LABELS: Partial<Record<Tab, string>> = {
  equipment: "Property Equipment",
  components: "Property Components",
  leases: "Property Tenants / Leases",
  workorders: "Property Work Orders",
  inspections: "Property Inspections",
  maintenance: "Property Preventive Maintenance",
};

/** Uses the existing `?tab=` deep-link convention of the Property profile. */
export function propertyTabHref(propertyId: string, tab: Tab): string {
  return `/properties/${propertyId}?tab=${tab}`;
}

function propertyTabTarget(propertyId: string, tab: Tab): BackTarget {
  return { href: propertyTabHref(propertyId, tab), label: `Back to ${PROPERTY_TAB_LABELS[tab] ?? "Property"}` };
}

/** Pages whose parent is a fixed list, regardless of how they were reached. */
export const GLOBAL_BACK_TARGETS = {
  properties: { href: "/properties", label: "Back to Properties" },
  vendors: { href: "/vendors", label: "Back to Vendors" },
  assets: { href: "/assets", label: "Back to Assets" },
  people: { href: "/people", label: "Back to People" },
  calendar: { href: "/calendar", label: "Back to Calendar" },
  adminUsers: { href: "/admin/users", label: "Back to Users & Access" },
  adminEquipmentTemplates: { href: "/admin/equipment-templates", label: "Back to Equipment Templates" },
  adminInspectionTemplates: { href: "/admin/inspection-templates", label: "Back to Inspection Templates" },
} as const satisfies Record<string, BackTarget>;

/** An edit screen's parent is the record it edits. */
export function editPageBackTarget(detailHref: string): BackTarget {
  return { href: detailHref, label: "Back to details" };
}

/** Equipment, Property Components and Leases always belong to exactly one Property. */
export function propertyOwnedBackTarget(record: { propertyId: string }, tab: Tab): BackTarget {
  return propertyTabTarget(record.propertyId, tab);
}

const PROPERTY_RECORD_PARENTS = {
  workOrder: { tab: "workorders", list: { href: "/work-orders", label: "Back to Work Orders" } },
  inspection: { tab: "inspections", list: { href: "/inspections", label: "Back to Inspections" } },
  preventiveMaintenance: {
    tab: "maintenance",
    list: { href: "/preventive-maintenance", label: "Back to Preventive Maintenance" },
  },
} as const satisfies Record<string, { tab: Tab; list: BackTarget }>;

export type PropertyRecordKind = keyof typeof PROPERTY_RECORD_PARENTS;

/**
 * Work Orders, Inspections and PM plans have a global list and a Property
 * tab. Opened from the Property tab → back to that tab; otherwise (global
 * list, Home, notification, direct link) → the global list.
 */
export function propertyRecordBackTarget(
  kind: PropertyRecordKind,
  record: { propertyId: string },
  fromPropertyId: string | undefined,
): BackTarget {
  const parent = PROPERTY_RECORD_PARENTS[kind];
  return fromPropertyId && fromPropertyId === record.propertyId
    ? propertyTabTarget(record.propertyId, parent.tab)
    : parent.list;
}

/**
 * Tenants are organization-level and reach a Property only through Leases,
 * so the Property's "Tenants / Leases" tab is the parent when it can be
 * determined: the Property the user came from, or the single Property the
 * viewer can see this Tenant's Leases at. Otherwise the Tenants list.
 */
export function tenantBackTarget(
  accessibleLeasePropertyIds: readonly string[],
  fromPropertyId: string | undefined,
): BackTarget {
  if (fromPropertyId && accessibleLeasePropertyIds.includes(fromPropertyId)) {
    return propertyTabTarget(fromPropertyId, "leases");
  }
  const distinct = new Set(accessibleLeasePropertyIds);
  if (distinct.size === 1) {
    return propertyTabTarget([...distinct][0], "leases");
  }
  return { href: "/tenants", label: "Back to Tenants" };
}
