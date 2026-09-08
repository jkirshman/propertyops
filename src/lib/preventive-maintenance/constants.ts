export const PREVENTIVE_MAINTENANCE_CAPABILITIES = {
  VIEW: "preventive_maintenance.view",
  CREATE: "preventive_maintenance.create",
  EDIT: "preventive_maintenance.edit",
  GENERATE: "preventive_maintenance.generate",
  MANAGE_STATUS: "preventive_maintenance.manage_status",
} as const;

export const PM_INTERVAL_UNITS = ["week", "month"] as const;
export type PmIntervalUnit = (typeof PM_INTERVAL_UNITS)[number];

// UI-only presets that resolve to an interval_unit/interval_value pair before
// hitting the API — recurrence is never stored as a named type, only as the
// deterministic unit+value pair (see docs/PROP-6 completion report).
export const PM_RECURRENCE_PRESETS = {
  weekly: { unit: "week", value: 1 },
  monthly: { unit: "month", value: 1 },
  quarterly: { unit: "month", value: 3 },
  semiannual: { unit: "month", value: 6 },
  annual: { unit: "month", value: 12 },
} as const satisfies Record<string, { unit: PmIntervalUnit; value: number }>;
export type PmRecurrencePreset = keyof typeof PM_RECURRENCE_PRESETS | "custom";

export const PM_RECURRENCE_PRESET_LABELS: Record<PmRecurrencePreset, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Semiannual",
  annual: "Annual",
  custom: "Custom",
};

export const PM_DUE_STATES = ["overdue", "due_soon", "upcoming"] as const;
export type PmDueState = (typeof PM_DUE_STATES)[number];

export const PM_DUE_STATE_LABELS: Record<PmDueState, string> = {
  overdue: "Overdue",
  due_soon: "Due Soon",
  upcoming: "Upcoming",
};

// Fixed threshold rather than a per-org setting — keeps the UX simple per PROP-6 scope.
export const PM_DUE_SOON_THRESHOLD_DAYS = 14;

export const PM_OCCURRENCE_STATUSES = ["generated", "completed", "cancelled"] as const;
export type PmOccurrenceStatus = (typeof PM_OCCURRENCE_STATUSES)[number];

export const PM_OCCURRENCE_STATUS_LABELS: Record<PmOccurrenceStatus, string> = {
  generated: "Generated",
  completed: "Completed",
  cancelled: "Cancelled",
};
