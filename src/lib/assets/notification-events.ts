import { ASSET_FILES_ENTITY_TYPE } from "@/lib/assets/constants";
import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

export interface AssetNotificationSubject {
  id: string;
  assetTag: string;
  displayName: string;
}

export function buildAssetAssignedNotification(asset: AssetNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.ASSET_ASSIGNED,
    title: `Assigned to you: ${asset.assetTag} — ${asset.displayName}`,
    body: asset.displayName,
    deepLinkUrl: `/assets/${asset.id}`,
    relatedEntityType: ASSET_FILES_ENTITY_TYPE,
    relatedEntityId: asset.id,
  };
}
