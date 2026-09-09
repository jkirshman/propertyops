import { EntityDocumentsPanel } from "@/components/shared/EntityDocumentsPanel";
import { PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE } from "@/lib/equipment/constants";

export function EquipmentDocumentsPanel({
  propertyEquipmentId,
  canManage,
}: {
  propertyEquipmentId: string;
  canManage: boolean;
}) {
  return (
    <EntityDocumentsPanel
      relatedEntityType={PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE}
      relatedEntityId={propertyEquipmentId}
      canManage={canManage}
    />
  );
}
