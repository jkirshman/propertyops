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
import { canAccessProperty, canAccessPropertyUnit, type PropertyScope } from "@/lib/auth/property-access";
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
  // null unless the related entity is itself Unit-scoped (currently only
  // Lease). Every Property-wide entity type resolves to `null` here even
  // though it clearly belongs to a Property — Documents/Files are
  // Property-wide everywhere in this app, so there is no Unit to check.
  propertyUnitId: string | null;
  // True only for Lease. Drives which access rule applies below — NOT simply
  // `propertyUnitId !== null`, because a Lease that hasn't been tied to a
  // specific Unit yet (propertyUnitId: null) must still go through the
  // stricter Unit-aware check: `leases.ts` (Tenant/Lease cluster) already
  // hides such a Lease from a Unit-restricted user, since which Unit it
  // belongs to can't be proven — a document attached to that same Lease must
  // be hidden from that same user too, or it becomes a bypass of that rule.
  // Every Property-wide entity type is `false` here even when its resolved
  // propertyUnitId also happens to be null, because those ARE meant to stay
  // visible to a Unit-restricted user (Property-wide data, per the brief).
  isUnitScopedEntity: boolean;
}

/**
 * ACCESS-1: resolves the Property (and, for Lease, Unit) a file/external-
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
      return row ? { propertyId: row.id, propertyUnitId: null, isUnitScopedEntity: false } : null;
    }
    case WORK_ORDER_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: workOrders.propertyId })
        .from(workOrders)
        .where(and(eq(workOrders.id, relatedEntityId), eq(workOrders.organizationId, organizationId)))
        .limit(1);
      return row ? { propertyId: row.propertyId, propertyUnitId: null, isUnitScopedEntity: false } : null;
    }
    case PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: propertyEquipment.propertyId })
        .from(propertyEquipment)
        .where(
          and(eq(propertyEquipment.id, relatedEntityId), eq(propertyEquipment.organizationId, organizationId)),
        )
        .limit(1);
      return row ? { propertyId: row.propertyId, propertyUnitId: null, isUnitScopedEntity: false } : null;
    }
    case PROPERTY_COMPONENT_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: propertyComponents.propertyId })
        .from(propertyComponents)
        .where(
          and(eq(propertyComponents.id, relatedEntityId), eq(propertyComponents.organizationId, organizationId)),
        )
        .limit(1);
      return row ? { propertyId: row.propertyId, propertyUnitId: null, isUnitScopedEntity: false } : null;
    }
    case LEASE_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: leases.propertyId, propertyUnitId: leases.propertyUnitId })
        .from(leases)
        .where(and(eq(leases.id, relatedEntityId), eq(leases.organizationId, organizationId)))
        .limit(1);
      return row ? { propertyId: row.propertyId, propertyUnitId: row.propertyUnitId, isUnitScopedEntity: true } : null;
    }
    case COMPLIANCE_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ propertyId: complianceRecords.propertyId })
        .from(complianceRecords)
        .where(
          and(eq(complianceRecords.id, relatedEntityId), eq(complianceRecords.organizationId, organizationId)),
        )
        .limit(1);
      return row ? { propertyId: row.propertyId, propertyUnitId: null, isUnitScopedEntity: false } : null;
    }
    case ASSET_FILES_ENTITY_TYPE: {
      const [row] = await db
        .select({ assignedPropertyId: assets.assignedPropertyId })
        .from(assets)
        .where(and(eq(assets.id, relatedEntityId), eq(assets.organizationId, organizationId)))
        .limit(1);
      return row?.assignedPropertyId ? { propertyId: row.assignedPropertyId, propertyUnitId: null, isUnitScopedEntity: false } : null;
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
 * Applies the standard ACCESS-1 decision for a resolved property context:
 * Unit-scoped records (Lease) require Unit-level access — including when the
 * Lease itself has no Unit set yet (propertyUnitId: null), which must still
 * go through canAccessPropertyUnit(..., null) so a Unit-restricted user is
 * denied (consistent with how the Leases module itself hides such a Lease
 * from them). Every other Property-scoped record only requires access to the
 * Property itself, regardless of its (always-null) propertyUnitId.
 */
export function canAccessRelatedEntityPropertyContext(
  scope: PropertyScope,
  context: RelatedEntityPropertyContext,
): boolean {
  return context.isUnitScopedEntity
    ? canAccessPropertyUnit(scope, context.propertyId, context.propertyUnitId)
    : canAccessProperty(scope, context.propertyId);
}
