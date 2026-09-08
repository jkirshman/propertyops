export const LEASE_CAPABILITIES = {
  VIEW: "lease.view",
  CREATE: "lease.create",
  EDIT: "lease.edit",
  MANAGE_DOCUMENTS: "lease.manage_documents",
  MANAGE_STATUS: "lease.manage_status",
} as const;

// Stored lifecycle — only states nothing else can derive. See lib/leases/status.ts.
export const LEASE_STATUSES = ["draft", "active", "month_to_month", "terminated"] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  draft: "Draft",
  active: "Active",
  month_to_month: "Month-to-Month",
  terminated: "Terminated",
};

// Derived/display status — combines the stored status with dates at read time.
export const LEASE_EFFECTIVE_STATUSES = [
  "draft",
  "upcoming",
  "active",
  "month_to_month",
  "expired",
  "terminated",
] as const;
export type LeaseEffectiveStatus = (typeof LEASE_EFFECTIVE_STATUSES)[number];

export const LEASE_EFFECTIVE_STATUS_LABELS: Record<LeaseEffectiveStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  active: "Active",
  month_to_month: "Month-to-Month",
  expired: "Expired",
  terminated: "Terminated",
};

export const LEASE_TYPES = ["residential", "commercial", "ground_lease", "internal", "other"] as const;
export type LeaseType = (typeof LEASE_TYPES)[number];

export const LEASE_TYPE_LABELS: Record<LeaseType, string> = {
  residential: "Residential",
  commercial: "Commercial",
  ground_lease: "Ground Lease",
  internal: "Internal / Related Party",
  other: "Other",
};

export const RENT_FREQUENCIES = ["monthly", "weekly", "quarterly", "annual", "other"] as const;
export type RentFrequency = (typeof RENT_FREQUENCIES)[number];

export const RENT_FREQUENCY_LABELS: Record<RentFrequency, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  quarterly: "Quarterly",
  annual: "Annual",
  other: "Other",
};

export const LEASE_FILES_ENTITY_TYPE = "lease";

export const LEASE_EXPIRING_THRESHOLDS_DAYS = [90, 60, 30] as const;
export const LEASE_DATE_APPROACHING_THRESHOLD_DAYS = 30;
