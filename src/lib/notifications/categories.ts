import { NOTIFICATION_TYPES, type NotificationType } from "./types";

// Fixed, user-facing grouping layer over the granular NOTIFICATION_TYPES
// identifiers — the Notification Preferences UI never exposes raw type
// strings, only these categories.
export const NOTIFICATION_CATEGORIES = [
  "work_orders",
  "preventive_maintenance",
  "inspections",
  "compliance",
  "leases",
  "equipment_assets",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  work_orders: "Work Orders",
  preventive_maintenance: "Preventive Maintenance",
  inspections: "Inspections",
  compliance: "Compliance",
  leases: "Leases",
  equipment_assets: "Equipment / Assets",
};

export function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}

// Every notification-creation call site's `type` maps to exactly one category.
// `system.test` (the admin "send test notification" diagnostic tool) is
// intentionally excluded — gating the one tool whose purpose is testing
// delivery would defeat it, so it is never subject to a user preference.
// Typed as a `Record` over every gated type (not a loose `Record<string, ...>`)
// so adding a new NOTIFICATION_TYPES value without mapping it here is a
// compile error, not a silent gap.
type GatedNotificationType = Exclude<NotificationType, typeof NOTIFICATION_TYPES.SYSTEM_TEST>;

const NOTIFICATION_TYPE_TO_CATEGORY: Record<GatedNotificationType, NotificationCategory> = {
  [NOTIFICATION_TYPES.WORK_ORDER_ASSIGNED]: "work_orders",
  [NOTIFICATION_TYPES.WORK_ORDER_RESOLVED]: "work_orders",
  [NOTIFICATION_TYPES.WORK_ORDER_CLOSED]: "work_orders",
  [NOTIFICATION_TYPES.WORK_ORDER_SCHEDULED]: "work_orders",
  [NOTIFICATION_TYPES.WORK_ORDER_RESCHEDULED]: "work_orders",
  [NOTIFICATION_TYPES.PREVENTIVE_MAINTENANCE_OVERDUE]: "preventive_maintenance",
  [NOTIFICATION_TYPES.PREVENTIVE_MAINTENANCE_WORK_ORDER_GENERATED]: "preventive_maintenance",
  [NOTIFICATION_TYPES.PREVENTIVE_MAINTENANCE_WORK_ORDER_COMPLETED]: "preventive_maintenance",
  [NOTIFICATION_TYPES.INSPECTION_COMPLETED_WITH_FINDINGS]: "inspections",
  [NOTIFICATION_TYPES.INSPECTION_SCHEDULED]: "inspections",
  [NOTIFICATION_TYPES.INSPECTION_RESCHEDULED]: "inspections",
  [NOTIFICATION_TYPES.COMPLIANCE_EXPIRING_SOON]: "compliance",
  [NOTIFICATION_TYPES.COMPLIANCE_EXPIRED]: "compliance",
  [NOTIFICATION_TYPES.LEASE_EXPIRING]: "leases",
  [NOTIFICATION_TYPES.LEASE_EXPIRED]: "leases",
  [NOTIFICATION_TYPES.LEASE_NOTICE_DATE_APPROACHING]: "leases",
  [NOTIFICATION_TYPES.LEASE_RENEWAL_OPTION_APPROACHING]: "leases",
  [NOTIFICATION_TYPES.EQUIPMENT_OUT_OF_SERVICE]: "equipment_assets",
  [NOTIFICATION_TYPES.EQUIPMENT_CONDITION_POOR]: "equipment_assets",
  [NOTIFICATION_TYPES.ASSET_ASSIGNED]: "equipment_assets",
};

/** Null for a type with no preference category (e.g. `system.test`) — such a notification is never gated. */
export function categoryForNotificationType(type: string): NotificationCategory | null {
  return (NOTIFICATION_TYPE_TO_CATEGORY as Record<string, NotificationCategory | undefined>)[type] ?? null;
}
