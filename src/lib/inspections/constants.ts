export const INSPECTION_CAPABILITIES = {
  VIEW: "inspection.view",
  CREATE: "inspection.create",
  EDIT: "inspection.edit",
  COMPLETE: "inspection.complete",
  SCHEDULE: "inspection.schedule",
} as const;

export const INSPECTION_TEMPLATE_CAPABILITIES = {
  VIEW: "inspection_template.view",
  MANAGE: "inspection_template.manage",
} as const;

export const INSPECTION_RESPONSE_TYPES = [
  "pass_fail",
  "yes_no",
  "text",
  "numeric",
  "date",
  "choice",
] as const;
export type InspectionResponseType = (typeof INSPECTION_RESPONSE_TYPES)[number];

export const INSPECTION_RESPONSE_TYPE_LABELS: Record<InspectionResponseType, string> = {
  pass_fail: "Pass / Fail",
  yes_no: "Yes / No",
  text: "Text",
  numeric: "Numeric",
  date: "Date",
  choice: "Choice (select one)",
};

export const INSPECTION_STATUSES = ["draft", "in_progress", "completed", "cancelled"] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const INSPECTION_RESULTS = ["passed", "passed_with_findings", "failed"] as const;
export type InspectionResult = (typeof INSPECTION_RESULTS)[number];

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = {
  passed: "Passed",
  passed_with_findings: "Passed with Findings",
  failed: "Failed",
};

export const INSPECTION_OUTCOMES = ["pass", "fail"] as const;
export type InspectionOutcome = (typeof INSPECTION_OUTCOMES)[number];
