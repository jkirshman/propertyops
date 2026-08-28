import { listEntityActivity } from "@/lib/audit/list-entity-activity";
import { PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE } from "@/lib/equipment/constants";

export async function listPropertyEquipmentActivity(organizationId: string, propertyEquipmentId: string) {
  return listEntityActivity(organizationId, PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE, propertyEquipmentId);
}
