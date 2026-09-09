export const CALENDAR_CAPABILITIES = {
  VIEW: "calendar.view",
  CREATE_MANUAL_EVENT: "calendar.create_manual_event",
  EDIT_MANUAL_EVENT: "calendar.edit_manual_event",
} as const;

// The module a projected event came from — doubles as the "type/source"
// filter and the restrained color key (one color per module, not per event).
export const CALENDAR_SOURCE_TYPES = [
  "work_order",
  "preventive_maintenance",
  "inspection",
  "compliance",
  "lease",
  "manual",
] as const;
export type CalendarSourceType = (typeof CALENDAR_SOURCE_TYPES)[number];

export const CALENDAR_SOURCE_TYPE_LABELS: Record<CalendarSourceType, string> = {
  work_order: "Work Order",
  preventive_maintenance: "Preventive Maintenance",
  inspection: "Inspection",
  compliance: "Compliance",
  lease: "Lease",
  manual: "Manual Event",
};

// A finer label within a module (e.g. which lease milestone) — used for the
// event chip's title/subtitle, never for a new color.
export const CALENDAR_CATEGORIES = [
  "work_order_scheduled",
  "pm_due",
  "pm_work_order",
  "inspection_scheduled",
  "inspection_due",
  "compliance_expiration",
  "lease_start",
  "lease_end",
  "lease_notice",
  "lease_renewal_option",
  "lease_move_in",
  "lease_move_out",
  "manual_event",
] as const;
export type CalendarCategory = (typeof CALENDAR_CATEGORIES)[number];

export const CALENDAR_CATEGORY_LABELS: Record<CalendarCategory, string> = {
  work_order_scheduled: "Scheduled Visit",
  pm_due: "PM Due",
  pm_work_order: "PM Work Order",
  inspection_scheduled: "Scheduled Inspection",
  inspection_due: "Inspection Due",
  compliance_expiration: "Compliance Expiration",
  lease_start: "Lease Start",
  lease_end: "Lease End",
  lease_notice: "Lease Notice Date",
  lease_renewal_option: "Lease Renewal Option",
  lease_move_in: "Move-In",
  lease_move_out: "Move-Out",
  manual_event: "Event",
};

export const OPERATIONAL_EVENT_STATUSES = ["active", "cancelled"] as const;
export type OperationalEventStatus = (typeof OPERATIONAL_EVENT_STATUSES)[number];

export const OPERATIONAL_EVENT_STATUS_LABELS: Record<OperationalEventStatus, string> = {
  active: "Active",
  cancelled: "Cancelled",
};
