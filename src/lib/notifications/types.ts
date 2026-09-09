// Minimal initial vocabulary, enough to prove the notification core end to end.
// Real event types arrive with the modules that produce them.
export const NOTIFICATION_TYPES = {
  SYSTEM_TEST: "system.test",
  WORK_ORDER_ASSIGNED: "work_order.assigned",
  WORK_ORDER_RESOLVED: "work_order.resolved",
  WORK_ORDER_CLOSED: "work_order.closed",
  WORK_ORDER_SCHEDULED: "work_order.scheduled",
  WORK_ORDER_RESCHEDULED: "work_order.rescheduled",
  EQUIPMENT_OUT_OF_SERVICE: "equipment.out_of_service",
  EQUIPMENT_CONDITION_POOR: "equipment.condition_poor",
  ASSET_ASSIGNED: "asset.assigned",
  PREVENTIVE_MAINTENANCE_OVERDUE: "preventive_maintenance.overdue",
  PREVENTIVE_MAINTENANCE_WORK_ORDER_GENERATED: "preventive_maintenance.work_order_generated",
  PREVENTIVE_MAINTENANCE_WORK_ORDER_COMPLETED: "preventive_maintenance.work_order_completed",
  INSPECTION_COMPLETED_WITH_FINDINGS: "inspection.completed_with_findings",
  INSPECTION_SCHEDULED: "inspection.scheduled",
  INSPECTION_RESCHEDULED: "inspection.rescheduled",
  COMPLIANCE_EXPIRING_SOON: "compliance.expiring_soon",
  COMPLIANCE_EXPIRED: "compliance.expired",
  LEASE_EXPIRING: "lease.expiring",
  LEASE_EXPIRED: "lease.expired",
  LEASE_NOTICE_DATE_APPROACHING: "lease.notice_date_approaching",
  LEASE_RENEWAL_OPTION_APPROACHING: "lease.renewal_option_approaching",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
