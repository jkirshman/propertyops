// Fixed vocabulary (mirrors CONTACT_TYPES's pattern) — not per-organization
// configurable. "component" (ACCESS-1) and "equipment" (PHOTO-1) are set by
// their entity upload routes, always paired with the owning FK; they are
// never offered as manual choices on the Property Photos tab.
export const PHOTO_CATEGORIES = [
  "exterior",
  "interior",
  "site",
  "unit_suite",
  "component",
  "equipment",
  "other",
] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  exterior: "Exterior",
  interior: "Interior",
  site: "Site",
  unit_suite: "Unit / Suite",
  component: "Property Component",
  equipment: "Equipment",
  other: "Other",
};

// PHOTO-1: the categories a Property Photos upload may choose from — general
// Property photos (plus the Unit/Suite tag). Entity photos are created from
// their own detail pages instead.
export const GENERAL_PHOTO_CATEGORIES = ["exterior", "interior", "site", "unit_suite", "other"] as const satisfies readonly PhotoCategory[];
export type GeneralPhotoCategory = (typeof GENERAL_PHOTO_CATEGORIES)[number];

export const EQUIPMENT_PHOTO_CATEGORY: PhotoCategory = "equipment";

// ACCESS-1: the one category a component-photo-only uploader may use.
export const COMPONENT_PHOTO_CATEGORY: PhotoCategory = "component";
