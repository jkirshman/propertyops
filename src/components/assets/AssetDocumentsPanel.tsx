import { EntityDocumentsPanel } from "@/components/shared/EntityDocumentsPanel";
import { ASSET_FILES_ENTITY_TYPE } from "@/lib/assets/constants";

export function AssetDocumentsPanel({ assetId, canManage }: { assetId: string; canManage: boolean }) {
  return (
    <EntityDocumentsPanel
      relatedEntityType={ASSET_FILES_ENTITY_TYPE}
      relatedEntityId={assetId}
      canManage={canManage}
    />
  );
}
