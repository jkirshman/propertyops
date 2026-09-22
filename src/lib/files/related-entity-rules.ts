import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  assets,
  complianceRecords,
  leases,
  properties,
  propertyComponents,
  propertyEquipment,
  workOrders,
} from "@/db/schema";
import { canAccessPropertyUnit, type PropertyScope } from "@/lib/auth/property-access";
import { ASSET_CAPABILITIES, ASSET_FILES_ENTITY_TYPE } from "@/lib/assets/constants";
import { COMPLIANCE_CAPABILITIES, COMPLIANCE_FILES_ENTITY_TYPE } from "@/lib/compliance/constants";
import { EQUIPMENT_CAPABILITIES, PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE } from "@/lib/equipment/constants";
import { LEASE_CAPABILITIES, LEASE_FILES_ENTITY_TYPE } from "@/lib/leases/constants";
import { PROPERTY_CAPABILITIES, PROPERTY_FILES_ENTITY_TYPE } from "@/lib/properties/constants";
import {
  PROPERTY_COMPONENT_CAPABILITIES,
  PROPERTY_COMPONENT_FILES_ENTITY_TYPE,
} from "@/lib/property-components/constants";
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
  [PROPERTY_COMPONENT_FILES_ENTITY_TYPE]: {
    viewCapability: PROPERTY_COMPONENT_CAPABILITIES.VIEW,
    manageCapability: PROPERTY_COMPONENT_CAPABILITIES.MANAGE_DOCUMENTS,
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

export interface RelatedEntityPropertyContext {
  propertyId: string;
  // UNIT-OPS-1: the Unit the related entity belongs to, or null for a
  // Property-wide / Shared record. Only Unit-ownable entities (Work Orders,
  // Equipment, Leases) ever resolve a non-null value; everything else is
  // Property-wide by nature. One rule applies to all of them — see
  // canAccessRelatedEntityPropertyContext.
  propertyUnitId: string | null;
}

/**
 * ACCESS-1: resolves the Property (and, for a Unit-owned record, Unit) a file/external-
 * document's related entity belongs to, so file/document access can be
 * checked against the requester's Property scope alongside the capability
 * check above. Returns `null` when the related entity type has no single
 * Property to scope by (Tenant — not property-scoped, no propertyId column,
 * may span multiple properties via its Leases; Vendor — org-wide, not
 * Property-scoped) or when the specific record has no Property assigned yet
 * (an unassigned/person-assigned Asset) — callers treat `null` as "not
 * Property-scoped, capability check alone is sufficient," never as a denial.
 */
export async function resolveRelatedEntityPropertyContext(
  organizationId: string,
  relatedEntityType: string,
  relatedEntityId: string,
): Promise<RelatedEntityPropertyContext | null> {
  switch (relatedEntityType) {
    case PROPERTY_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(and(eq(properties.id, relatedEntityId), eq(properties.organizationId, organizationId)))
        .limit(1);
      return row ? { propertyId: row.id, propertyUnitId: null } : null;
    }
    case WORK_ORDER_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: workOrders.propertyId, propertyUnitId: workOrders.propertyUnitId })
        .from(workOrders)
        .where(and(eq(workOrders.id, relatedEntityId), eq(workOrders.organizationId, organizationId)))
        .limit(1);
      // UNIT-OPS-1: Work Order attachments inherit the Work Order's own
      // visibility — another Unit's attachments (and their filenames) 404.
      return row ? { propertyId: row.propertyId, propertyUnitId: row.propertyUnitId } : null;
    }
    case PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: propertyEquipment.propertyId, propertyUnitId: propertyEquipment.propertyUnitId })
        .from(propertyEquipment)
        .where(
          and(eq(propertyEquipment.id, relatedEntityId), eq(propertyEquipment.organizationId, organizationId)),
        )
        .limit(1);
      // UNIT-EQUIP-1: Equipment documents and photo images inherit Equipment
      // visibility (Shared Equipment's stay visible to Unit-restricted users).
      return row ? { propertyId: row.propertyId, propertyUnitId: row.propertyUnitId } : null;
    }
    case PROPERTY_COMPONENT_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: propertyComponents.propertyId })
        .from(propertyComponents)
        .where(
          and(eq(propertyComponents.id, relatedEntityId), eq(propertyComponents.organizationId, organizationId)),
        )
        .limit(1);
      return row ? { propertyId: row.propertyId, propertyUnitId: null } : null;
    }
    case LEASE_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: leases.propertyId, propertyUnitId: leases.propertyUnitId })
        .from(leases)
        .where(and(eq(leases.id, relatedEntityId), eq(leases.organizationId, organizationId)))
        .limit(1);
      // UNIT-OPS-1: a Lease with no Unit is Property-wide / Shared, exactly
      // as the Lease list and detail pages treat it.
      return row ? { propertyId: row.propertyId, propertyUnitId: row.propertyUnitId } : null;
    }
    case COMPLIANCE_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: complianceRecords.propertyId })
        .from(complianceRecords)
        .where(
          and(eq(complianceRecords.id, relatedEntityId), eq(complianceRecords.organizationId, organizationId)),
        )
        .limit(1);
      return row ? { propertyId: row.propertyId, propertyUnitId: null } : null;
    }
    case ASSET_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ assignedPropertyId: assets.assignedPropertyId })
        .from(assets)
        .where(and(eq(assets.id, relatedEntityId), eq(assets.organizationId, organizationId)))
        .limit(1);
      return row?.assignedPropertyId ? { propertyId: row.assignedPropertyId, propertyUnitId: null } : null;
    }
    // Tenant (no propertyId column — may span multiple Properties via its
    // Leases) and Vendor (org-wide, not Property-scoped) have no single
    // Property to check — capability gating alone governs their attached
    // files/documents.
    case TENANT_FILES_ENTITY_TYPE:
    case VENDOR_FILES_ENTITY_TYPE:
    default:
      return null;
  }
}

/**
 * Applies the standard ACCESS-1 / UNIT-OPS-1 decision for a resolved
 * property context: the same canAccessPropertyUnit rule the related record's
 * own pages use. A Property-wide / Shared context (propertyUnitId null) only
 * needs access to the Property; a Unit-owned one needs whole-Property access
 * or a row for that Unit.
 */
export function canAccessRelatedEntityPropertyContext(
  scope: PropertyScope,
  context: RelatedEntityPropertyContext,
): boolean {
  return canAccessPropertyUnit(scope, context.propertyId, context.propertyUnitId);
}
