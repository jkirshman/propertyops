import { NOTIFICATION_TYPES } from "@/lib/notifications/types";
import { WORK_ORDER_FILES_ENTITY_TYPE } from "@/lib/work-orders/constants";

export interface WorkOrderNotificationSubject {
  id: string;
  number: string;
  subject: string;
}

function baseFields(workOrder: WorkOrderNotificationSubject) {
  return {
    body: workOrder.subject,
    deepLinkUrl: `/work-orders/${workOrder.id}`,
    relatedEntityType: WORK_ORDER_FILES_ENTITY_TYPE,
    relatedEntityId: workOrder.id,
  };
}

export function buildWorkOrderAssignedNotification(workOrder: WorkOrderNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.WORK_ORDER_ASSIGNED,
    title: `Assigned to you: ${workOrder.number}`,
    ...baseFields(workOrder),
  };
}

export function buildWorkOrderResolvedNotification(workOrder: WorkOrderNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.WORK_ORDER_RESOLVED,
    title: `Resolved: ${workOrder.number}`,
    ...baseFields(workOrder),
  };
}

export function buildWorkOrderClosedNotification(workOrder: WorkOrderNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.WORK_ORDER_CLOSED,
    title: `Closed: ${workOrder.number}`,
    ...baseFields(workOrder),
  };
}
