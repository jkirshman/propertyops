// Fixed, seeded vocabulary (not a per-organization configurable taxonomy) —
// short, unlikely to need per-org customization, matching how
// EQUIPMENT_CONDITIONS/EQUIPMENT_STATUSES are modeled.
export const COMPONENT_TYPES = [
  "roof",
  "parking_lot",
  "sidewalk",
  "landscaping",
  "exterior_lighting",
  "building_envelope",
  "gutters_drainage",
  "signage",
  "dumpster_enclosure",
  "fencing",
  "loading_area",
  "other",
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  roof: "Roof",
  parking_lot: "Parking Lot",
  sidewalk: "Sidewalk",
  landscaping: "Landscaping",
  exterior_lighting: "Exterior Lighting",
  building_envelope: "Building Envelope",
  gutters_drainage: "Gutters / Drainage",
  signage: "Signage",
  dumpster_enclosure: "Dumpster Enclosure",
  fencing: "Fencing",
  loading_area: "Loading Area",
  other: "Other",
};

export const PROPERTY_COMPONENT_CAPABILITIES = {
  VIEW: "property_component.view",
  CREATE: "property_component.create",
  EDIT: "property_component.edit",
  MANAGE_SERVICE: "property_component.manage_service",
  MANAGE_DOCUMENTS: "property_component.manage_documents",
} as const;

export const PROPERTY_COMPONENT_FILES_ENTITY_TYPE = "property_component";
