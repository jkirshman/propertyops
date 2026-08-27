export const WORK_ORDER_CAPABILITIES = {
  VIEW: "work_order.view",
  CREATE: "work_order.create",
  EDIT: "work_order.edit",
  ASSIGN: "work_order.assign",
  MANAGE_STATUS: "work_order.manage_status",
  MANAGE_NOTES: "work_order.manage_notes",
  MANAGE_ATTACHMENTS: "work_order.manage_attachments",
} as const;

export const WORK_ORDER_CATEGORY_CAPABILITIES = {
  VIEW: "work_order_category.view",
  MANAGE: "work_order_category.manage",
} as const;

export const WORK_ORDER_STATUSES = [
  "new",
  "open",
  "in_progress",
  "waiting",
  "resolved",
  "closed",
  "cancelled",
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  new: "New",
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const WORK_ORDER_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const WORK_ORDER_NOTE_VISIBILITIES = ["internal"] as const;
export type WorkOrderNoteVisibility = (typeof WORK_ORDER_NOTE_VISIBILITIES)[number];

export const WORK_ORDER_FILES_ENTITY_TYPE = "work_order";
