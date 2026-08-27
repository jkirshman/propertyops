// Minimal initial vocabulary, enough to prove the notification core end to end.
// Real event types (work order updates, equipment alerts, etc.) arrive with the
// modules that produce them.
export const NOTIFICATION_TYPES = {
  SYSTEM_TEST: "system.test",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
