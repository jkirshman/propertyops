import { ASSET_CAPABILITIES, ASSET_FILES_ENTITY_TYPE } from "@/lib/assets/constants";
import { EQUIPMENT_CAPABILITIES, PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE } from "@/lib/equipment/constants";
import { PROPERTY_CAPABILITIES, PROPERTY_FILES_ENTITY_TYPE } from "@/lib/properties/constants";
import { WORK_ORDER_CAPABILITIES, WORK_ORDER_FILES_ENTITY_TYPE } from "@/lib/work-orders/constants";

export interface RelatedEntityFileRules {
  viewCapability: string;
  manageCapability: string;
}

/**
 * Capability gating for files attached to a given related-entity type. New
 * modules that attach files (Equipment, Assets, ...) register a rule here
 * instead of the /api/files routes growing a per-module branch.
 */
const RELATED_ENTITY_FILE_RULES: Record<string, RelatedEntityFileRules> = {
  [PROPERTY_FILES_ENTITY_TYPE]: {
    viewCapability: PROPERTY_CAPABILITIES.VIEW,
    manageCapability: PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS,
  },
  [WORK_ORDER_FILES_ENTITY_TYPE]: {
    viewCapability: WORK_ORDER_CAPABILITIES.VIEW,
    manageCapability: WORK_ORDER_CAPABILITIES.MANAGE_ATTACHMENTS,
  },
  [PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE]: {
    viewCapability: EQUIPMENT_CAPABILITIES.VIEW,
    manageCapability: EQUIPMENT_CAPABILITIES.MANAGE_DOCUMENTS,
  },
  [ASSET_FILES_ENTITY_TYPE]: {
    viewCapability: ASSET_CAPABILITIES.VIEW,
    manageCapability: ASSET_CAPABILITIES.MANAGE_DOCUMENTS,
  },
};

export function getRelatedEntityFileRules(
  relatedEntityType: string | undefined,
): RelatedEntityFileRules | null {
  if (!relatedEntityType) {
    return null;
  }
  return RELATED_ENTITY_FILE_RULES[relatedEntityType] ?? null;
}
