// LIFECYCLE-1A: which lifecycle states each Property list shows, kept pure so
// it can be unit tested. properties.is_active stays the source of truth;
// user-facing wording is always "Active" / "Archived", never "Inactive".

export type PropertyLifecycleStatus = "active" | "archived";

export type PropertyLifecycleFilter = "all" | PropertyLifecycleStatus;

export const PROPERTY_LIFECYCLE_FILTERS: readonly PropertyLifecycleFilter[] = ["all", "active", "archived"];

export const PROPERTY_LIFECYCLE_LABELS: Record<PropertyLifecycleStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const PROPERTY_LIFECYCLE_FILTER_LABELS: Record<PropertyLifecycleFilter, string> = {
  all: "All",
  ...PROPERTY_LIFECYCLE_LABELS,
};

export function propertyLifecycleStatus(property: { isActive: boolean }): PropertyLifecycleStatus {
  return property.isActive ? "active" : "archived";
}

/** Admin → Properties defaults to All; anything unrecognised falls back to All. */
export function parsePropertyLifecycleFilter(value: string | null | undefined): PropertyLifecycleFilter {
  return PROPERTY_LIFECYCLE_FILTERS.includes(value as PropertyLifecycleFilter) ? (value as PropertyLifecycleFilter) : "all";
}

/** The listProperties isActive option for a filter (undefined = no lifecycle filter). */
export function lifecycleFilterToIsActive(filter: PropertyLifecycleFilter): boolean | undefined {
  if (filter === "all") return undefined;
  return filter === "active";
}

/** The single lifecycle action Admin → Properties offers for a row. */
export function availableLifecycleAction(property: { isActive: boolean }): "archive" | "restore" {
  return property.isActive ? "archive" : "restore";
}

/**
 * Query string for the main /properties list. Always active-only: the normal
 * Properties experience has no lifecycle filter, so archived Properties are
 * never browsable there — lifecycle filtering lives in Admin → Properties.
 */
export function buildMainPropertiesListQuery(filters: {
  search?: string;
  propertyTypeId?: string;
  propertyCompanyId?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.propertyTypeId) {
    params.set("propertyTypeId", filters.propertyTypeId);
  }
  if (filters.propertyCompanyId) {
    params.set("propertyCompanyId", filters.propertyCompanyId);
  }
  params.set("active", "true");
  return params;
}
