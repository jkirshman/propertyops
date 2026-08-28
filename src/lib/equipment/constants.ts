export const EQUIPMENT_CAPABILITIES = {
  VIEW: "equipment.view",
  CREATE: "equipment.create",
  EDIT: "equipment.edit",
  MANAGE_SERVICE: "equipment.manage_service",
  MANAGE_DOCUMENTS: "equipment.manage_documents",
} as const;

export const EQUIPMENT_CATALOG_CAPABILITIES = {
  VIEW: "equipment_catalog.view",
  MANAGE: "equipment_catalog.manage",
} as const;

export const EQUIPMENT_TEMPLATE_CAPABILITIES = {
  VIEW: "equipment_template.view",
  MANAGE: "equipment_template.manage",
} as const;

export const EQUIPMENT_STATUSES = ["active", "out_of_service", "retired"] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  active: "Active",
  out_of_service: "Out of Service",
  retired: "Retired",
};

export const EQUIPMENT_CONDITIONS = ["good", "fair", "poor", "unknown"] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];

export const EQUIPMENT_CONDITION_LABELS: Record<EquipmentCondition, string> = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  unknown: "Unknown",
};

export const EQUIPMENT_SERVICE_TYPES = [
  "preventive_maintenance",
  "repair",
  "inspection",
  "installation",
  "replacement",
  "other",
] as const;
export type EquipmentServiceType = (typeof EQUIPMENT_SERVICE_TYPES)[number];

export const EQUIPMENT_SERVICE_TYPE_LABELS: Record<EquipmentServiceType, string> = {
  preventive_maintenance: "Preventive Maintenance",
  repair: "Repair",
  inspection: "Inspection",
  installation: "Installation",
  replacement: "Replacement",
  other: "Other",
};

// 'default' resolves the property type's default template; 'override' uses the
// property's own equipmentTemplateId; 'none' means no expected equipment at all.
export const PROPERTY_EQUIPMENT_TEMPLATE_MODES = ["default", "override", "none"] as const;
export type PropertyEquipmentTemplateMode = (typeof PROPERTY_EQUIPMENT_TEMPLATE_MODES)[number];

export const PROPERTY_EQUIPMENT_TEMPLATE_MODE_LABELS: Record<PropertyEquipmentTemplateMode, string> = {
  default: "Use property type default",
  override: "Use a specific template",
  none: "No template (no expected equipment)",
};

export const PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE = "property_equipment";
