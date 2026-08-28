export const ASSET_CAPABILITIES = {
  VIEW: "asset.view",
  CREATE: "asset.create",
  EDIT: "asset.edit",
  // Covers assign, transfer, and return — all the same underlying "change
  // custody" operation, so a separate asset.transfer capability would only
  // fragment permissions without adding real control.
  ASSIGN: "asset.assign",
  RETIRE: "asset.retire",
  MANAGE_DOCUMENTS: "asset.manage_documents",
  ONBOARDING: "asset.onboarding",
  OFFBOARDING: "asset.offboarding",
} as const;

export const ASSET_CATEGORY_CAPABILITIES = {
  VIEW: "asset_category.view",
  MANAGE: "asset_category.manage",
} as const;

export const ASSET_STATUSES = ["available", "assigned", "retired", "lost", "disposed"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  available: "Available",
  assigned: "Assigned",
  retired: "Retired",
  lost: "Lost",
  disposed: "Disposed",
};

export const ASSET_CONDITIONS = ["new", "good", "fair", "poor", "damaged", "unknown"] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
  unknown: "Unknown",
};

export const ASSET_ASSIGNMENT_TYPES = ["person", "property", "unassigned"] as const;
export type AssetAssignmentType = (typeof ASSET_ASSIGNMENT_TYPES)[number];

export const ASSET_ASSIGNMENT_TYPE_LABELS: Record<AssetAssignmentType, string> = {
  person: "Person",
  property: "Property",
  unassigned: "Unassigned / Back Stock",
};

// Movement is blocked once an asset reaches one of these terminal statuses;
// 'retired' can be undone via a Reactivate action, 'disposed' cannot.
export const ASSET_TERMINAL_STATUSES: readonly AssetStatus[] = ["retired", "disposed"];

export const ASSET_FILES_ENTITY_TYPE = "asset";
