import { PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE } from "@/lib/equipment/constants";
import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

export interface PropertyEquipmentNotificationSubject {
  id: string;
  displayName: string;
}

function baseFields(equipment: PropertyEquipmentNotificationSubject) {
  return {
    body: equipment.displayName,
    deepLinkUrl: `/equipment/${equipment.id}`,
    relatedEntityType: PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE,
    relatedEntityId: equipment.id,
  };
}

export function buildEquipmentOutOfServiceNotification(equipment: PropertyEquipmentNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.EQUIPMENT_OUT_OF_SERVICE,
    title: `Out of service: ${equipment.displayName}`,
    ...baseFields(equipment),
  };
}

export function buildEquipmentConditionPoorNotification(equipment: PropertyEquipmentNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.EQUIPMENT_CONDITION_POOR,
    title: `Condition: Poor — ${equipment.displayName}`,
    ...baseFields(equipment),
  };
}
