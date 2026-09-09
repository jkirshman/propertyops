import { EntityDocumentsPanel } from "@/components/shared/EntityDocumentsPanel";
import { PROPERTY_FILES_ENTITY_TYPE } from "@/lib/properties/constants";

export function DocumentsPanel({ propertyId, canManage }: { propertyId: string; canManage: boolean }) {
  return (
    <EntityDocumentsPanel
      relatedEntityType={PROPERTY_FILES_ENTITY_TYPE}
      relatedEntityId={propertyId}
      canManage={canManage}
    />
  );
}
