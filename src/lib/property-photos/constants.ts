// Fixed vocabulary (mirrors CONTACT_TYPES's pattern) — not per-organization
// configurable.
export const PHOTO_CATEGORIES = ["exterior", "interior", "site", "unit_suite", "other"] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  exterior: "Exterior",
  interior: "Interior",
  site: "Site",
  unit_suite: "Unit / Suite",
  other: "Other",
};
