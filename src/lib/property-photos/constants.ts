// Fixed vocabulary (mirrors CONTACT_TYPES's pattern) — not per-organization
// configurable. "component" (ACCESS-1) is the only category a
// PROPERTY_COMPONENT_CAPABILITIES.UPLOAD_PHOTO-only user (no full photo
// management) may use, always paired with propertyComponentId.
export const PHOTO_CATEGORIES = ["exterior", "interior", "site", "unit_suite", "component", "other"] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  exterior: "Exterior",
  interior: "Interior",
  site: "Site",
  unit_suite: "Unit / Suite",
  component: "Property Component",
  other: "Other",
};

// ACCESS-1: the one category a component-photo-only uploader may use.
export const COMPONENT_PHOTO_CATEGORY: PhotoCategory = "component";
