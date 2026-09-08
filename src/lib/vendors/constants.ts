export const VENDOR_CAPABILITIES = {
  VIEW: "vendor.view",
  CREATE: "vendor.create",
  EDIT: "vendor.edit",
  MANAGE_CONTACTS: "vendor.manage_contacts",
  MANAGE_COVERAGE: "vendor.manage_coverage",
  MANAGE_DOCUMENTS: "vendor.manage_documents",
  ASSIGN_WORK_ORDERS: "vendor.assign_work_orders",
} as const;

export const VENDOR_CATEGORY_CAPABILITIES = {
  VIEW: "vendor_category.view",
  MANAGE: "vendor_category.manage",
} as const;

export const VENDOR_COVERAGE_MODES = ["all", "specific"] as const;
export type VendorCoverageMode = (typeof VENDOR_COVERAGE_MODES)[number];

export const VENDOR_COVERAGE_MODE_LABELS: Record<VendorCoverageMode, string> = {
  all: "All properties",
  specific: "Specific properties only",
};

export const VENDOR_FILES_ENTITY_TYPE = "vendor";
