export const COMPLIANCE_CAPABILITIES = {
  VIEW: "compliance.view",
  CREATE: "compliance.create",
  EDIT: "compliance.edit",
  MANAGE_DOCUMENTS: "compliance.manage_documents",
} as const;

// Fixed constant list rather than a configurable per-org taxonomy table —
// this domain doesn't need the same customization Vendor/Inspection categories do.
export const COMPLIANCE_CATEGORIES = [
  "certificate",
  "license",
  "permit",
  "fire_inspection_certificate",
  "occupancy_certificate",
  "elevator_certificate",
  "insurance_document",
  "municipal_inspection_record",
  "other",
] as const;
export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number];

export const COMPLIANCE_CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  certificate: "Certificate",
  license: "License",
  permit: "Permit",
  fire_inspection_certificate: "Fire Inspection Certificate",
  occupancy_certificate: "Occupancy Certificate",
  elevator_certificate: "Elevator Certificate",
  insurance_document: "Insurance-Related Document",
  municipal_inspection_record: "Municipal Inspection Record",
  other: "Other",
};

export const COMPLIANCE_FILES_ENTITY_TYPE = "compliance_record";
