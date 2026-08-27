// Minimal initial vocabulary, enough to prove the notification core end to end.
// Real event types arrive with the modules that produce them.
export const NOTIFICATION_TYPES = {
  SYSTEM_TEST: "system.test",
  WORK_ORDER_ASSIGNED: "work_order.assigned",
  WORK_ORDER_RESOLVED: "work_order.resolved",
  WORK_ORDER_CLOSED: "work_order.closed",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
