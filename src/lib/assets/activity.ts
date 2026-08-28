import { listEntityActivity } from "@/lib/audit/list-entity-activity";
import { ASSET_FILES_ENTITY_TYPE } from "@/lib/assets/constants";

export async function listAssetActivity(organizationId: string, assetId: string) {
  return listEntityActivity(organizationId, ASSET_FILES_ENTITY_TYPE, assetId);
}
