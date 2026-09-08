import { ASSET_CAPABILITIES, ASSET_FILES_ENTITY_TYPE } from "@/lib/assets/constants";
import { COMPLIANCE_CAPABILITIES, COMPLIANCE_FILES_ENTITY_TYPE } from "@/lib/compliance/constants";
import { EQUIPMENT_CAPABILITIES, PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE } from "@/lib/equipment/constants";
import { LEASE_CAPABILITIES, LEASE_FILES_ENTITY_TYPE } from "@/lib/leases/constants";
import { PROPERTY_CAPABILITIES, PROPERTY_FILES_ENTITY_TYPE } from "@/lib/properties/constants";
import { TENANT_CAPABILITIES, TENANT_FILES_ENTITY_TYPE } from "@/lib/tenants/constants";
import { VENDOR_CAPABILITIES, VENDOR_FILES_ENTITY_TYPE } from "@/lib/vendors/constants";
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
  [VENDOR_FILES_ENTITY_TYPE]: {
    viewCapability: VENDOR_CAPABILITIES.VIEW,
    manageCapability: VENDOR_CAPABILITIES.MANAGE_DOCUMENTS,
  },
  [COMPLIANCE_FILES_ENTITY_TYPE]: {
    viewCapability: COMPLIANCE_CAPABILITIES.VIEW,
    manageCapability: COMPLIANCE_CAPABILITIES.MANAGE_DOCUMENTS,
  },
  [TENANT_FILES_ENTITY_TYPE]: {
    viewCapability: TENANT_CAPABILITIES.VIEW,
    manageCapability: TENANT_CAPABILITIES.MANAGE_DOCUMENTS,
  },
  [LEASE_FILES_ENTITY_TYPE]: {
    viewCapability: LEASE_CAPABILITIES.VIEW,
    manageCapability: LEASE_CAPABILITIES.MANAGE_DOCUMENTS,
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
