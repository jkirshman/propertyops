import { NOTIFICATION_TYPES } from "@/lib/notifications/types";
import { WORK_ORDER_FILES_ENTITY_TYPE } from "@/lib/work-orders/constants";

export interface PmWorkOrderNotificationSubject {
  id: string;
  number: string;
  subject: string;
}

function workOrderFields(workOrder: PmWorkOrderNotificationSubject) {
  return {
    body: workOrder.subject,
    deepLinkUrl: `/work-orders/${workOrder.id}`,
    relatedEntityType: WORK_ORDER_FILES_ENTITY_TYPE,
    relatedEntityId: workOrder.id,
  };
}

export function buildPmWorkOrderGeneratedNotification(
  workOrder: PmWorkOrderNotificationSubject,
  planName: string,
) {
  return {
    type: NOTIFICATION_TYPES.PREVENTIVE_MAINTENANCE_WORK_ORDER_GENERATED,
    title: `Preventive maintenance due: ${planName}`,
    ...workOrderFields(workOrder),
  };
}

export function buildPmWorkOrderCompletedNotification(workOrder: PmWorkOrderNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.PREVENTIVE_MAINTENANCE_WORK_ORDER_COMPLETED,
    title: `Preventive maintenance completed: ${workOrder.number}`,
    ...workOrderFields(workOrder),
  };
}

export function buildPmPlanOverdueNotification(planId: string, planName: string, dueDate: string) {
  return {
    type: NOTIFICATION_TYPES.PREVENTIVE_MAINTENANCE_OVERDUE,
    title: `Preventive maintenance overdue: ${planName}`,
    body: `Was due ${dueDate}.`,
    deepLinkUrl: `/preventive-maintenance/${planId}`,
    relatedEntityType: "preventive_maintenance_plan",
    relatedEntityId: planId,
    // Durable per-occurrence dedupe: repeated daily cron runs never re-notify
    // for the same missed due date once it's already been flagged.
    dedupeKey: `pm_overdue:${planId}:${dueDate}`,
  };
}
