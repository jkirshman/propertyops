import { and, asc, eq, getTableColumns, inArray, or } from "drizzle-orm";

import { db } from "@/db/client";
import { properties, propertyEquipment, propertyUnits } from "@/db/schema";
import type { PropertyScope } from "@/lib/auth/property-access";
import { stripUndefined } from "@/lib/db/strip-undefined";
import {
  canAccessPropertyEquipment,
  listAssignableEquipmentUnits,
  resolveEquipmentUnitAssignment,
  type EquipmentUnitAssignmentDecision,
} from "@/lib/equipment/equipment-access";
import { getPropertyType } from "@/lib/properties/property-types";
import { getPropertyUnit, listPropertyUnits } from "@/lib/property-units/property-units";
import type {
  CreatePropertyEquipmentInput,
  UpdatePropertyEquipmentInput,
} from "@/lib/validation/property-equipment";

export async function listPropertyEquipment(
  organizationId: string,
  propertyId: string,
  options: { activeOnly?: boolean } = {},
) {
  const conditions = [
    eq(propertyEquipment.organizationId, organizationId),
    eq(propertyEquipment.propertyId, propertyId),
  ];
  if (options.activeOnly) {
    conditions.push(eq(propertyEquipment.isActive, true));
  }

  // UNIT-EQUIP-1: carries the owning Unit's label so lists can show
  // "Unit A" / "Property-wide" without a second round trip. Unfiltered by
  // Unit on purpose — callers apply filterAccessibleEquipment.
  return db
    .select({
      ...getTableColumns(propertyEquipment),
      unitLabel: propertyUnits.unitLabel,
      unitIsActive: propertyUnits.isActive,
    })
    .from(propertyEquipment)
    .leftJoin(propertyUnits, eq(propertyUnits.id, propertyEquipment.propertyUnitId))
    .where(and(...conditions))
    .orderBy(asc(propertyEquipment.displayName));
}

// Org-wide (unlike listPropertyEquipment, which is single-property) — powers
// the Home App Brief's "Equipment needing attention" section.
export async function listPropertyEquipmentNeedingAttention(
  organizationId: string,
  // ACCESS-1: null/omitted = unrestricted; an array scopes to those
  // properties; an empty array short-circuits to no rows.
  propertyIds?: string[] | null,
) {
  if (propertyIds !== undefined && propertyIds !== null && propertyIds.length === 0) {
    return [];
  }

  const conditions = [
    eq(propertyEquipment.organizationId, organizationId),
    eq(propertyEquipment.isActive, true),
    or(eq(propertyEquipment.condition, "poor"), eq(propertyEquipment.status, "out_of_service"))!,
  ];
  if (propertyIds !== undefined && propertyIds !== null) {
    conditions.push(inArray(propertyEquipment.propertyId, propertyIds));
  }

  return db
    .select({
      id: propertyEquipment.id,
      displayName: propertyEquipment.displayName,
      condition: propertyEquipment.condition,
      status: propertyEquipment.status,
      propertyId: propertyEquipment.propertyId,
      propertyUnitId: propertyEquipment.propertyUnitId,
      propertyName: properties.name,
    })
    .from(propertyEquipment)
    .innerJoin(properties, eq(properties.id, propertyEquipment.propertyId))
    .where(and(...conditions))
    .orderBy(asc(properties.name), asc(propertyEquipment.displayName));
}

export async function getPropertyEquipment(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(propertyEquipment)
    .where(and(eq(propertyEquipment.id, id), eq(propertyEquipment.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

/**
 * UNIT-EQUIP-1: an Equipment record only if the scope may see it — null for
 * missing, cross-org, and other-Unit Equipment alike, so callers (Work Order
 * / PM / Inspection links, "?equipmentId=" prefill, list filters) fail closed
 * without distinguishing "doesn't exist" from "not yours".
 */
export async function getAccessiblePropertyEquipment(organizationId: string, scope: PropertyScope, id: string) {
  const row = await getPropertyEquipment(organizationId, id);
  return row && canAccessPropertyEquipment(scope, row) ? row : null;
}

export async function createPropertyEquipment(
  organizationId: string,
  propertyId: string,
  input: CreatePropertyEquipmentInput,
) {
  const [row] = await db
    .insert(propertyEquipment)
    .values({
      organizationId,
      propertyId,
      propertyUnitId: input.propertyUnitId ?? null,
      equipmentCatalogItemId: input.equipmentCatalogItemId,
      displayName: input.displayName,
      equipmentTag: input.equipmentTag ?? null,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      serialNumber: input.serialNumber ?? null,
      installedDate: input.installedDate ?? null,
      manufactureYear: input.manufactureYear ?? null,
      locationInProperty: input.locationInProperty ?? null,
      quantity: input.quantity ?? 1,
      status: input.status ?? "active",
      condition: input.condition ?? "unknown",
      expectedReplacementDate: input.expectedReplacementDate ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updatePropertyEquipment(
  organizationId: string,
  id: string,
  input: UpdatePropertyEquipmentInput,
) {
  const [row] = await db
    .update(propertyEquipment)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(propertyEquipment.id, id), eq(propertyEquipment.organizationId, organizationId)))
    .returning();
  return row ?? null;
}

/**
 * UNIT-EQUIP-1: the Unit/Suite selector's options for one Property.
 * `supportsUnits` false means no selector at all (Equipment stays
 * Property-wide).
 */
export async function getEquipmentUnitOptions(
  organizationId: string,
  property: { id: string; propertyTypeId: string },
  scope: PropertyScope,
) {
  const propertyType = await getPropertyType(organizationId, property.propertyTypeId);
  const supportsUnits = Boolean(propertyType?.supportsUnits);
  if (!supportsUnits) {
    return { supportsUnits, units: [], allowPropertyWide: true };
  }
  const { units, allowPropertyWide } = listAssignableEquipmentUnits(
    scope,
    property.id,
    await listPropertyUnits(organizationId, property.id, { activeOnly: true }),
  );
  return {
    supportsUnits,
    units: units.map((unit) => ({ id: unit.id, unitLabel: unit.unitLabel, name: unit.name })),
    allowPropertyWide,
  };
}

/** Does the DB lookups for resolveEquipmentUnitAssignment (create + update share it). */
export async function checkEquipmentUnitAssignment(params: {
  organizationId: string;
  scope: PropertyScope;
  property: { id: string; propertyTypeId: string };
  mode: "create" | "update";
  requestedUnitId: string | null | undefined;
  currentUnitId: string | null;
}): Promise<EquipmentUnitAssignmentDecision> {
  const { organizationId, property, requestedUnitId } = params;
  const needsLookup = typeof requestedUnitId === "string" && requestedUnitId !== params.currentUnitId;
  const [propertyType, unitCandidate] = needsLookup
    ? await Promise.all([
        getPropertyType(organizationId, property.propertyTypeId),
        getPropertyUnit(organizationId, property.id, requestedUnitId),
      ])
    : [null, null];

  return resolveEquipmentUnitAssignment({
    scope: params.scope,
    organizationId,
    propertyId: property.id,
    supportsUnits: Boolean(propertyType?.supportsUnits),
    mode: params.mode,
    requestedUnitId,
    currentUnitId: params.currentUnitId,
    unitCandidate,
  });
}
