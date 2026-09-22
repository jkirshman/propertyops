import type { PropertyScope } from "@/lib/auth/property-access";
import { getPropertyType } from "@/lib/properties/property-types";
import { getPropertyUnit, listPropertyUnits } from "@/lib/property-units/property-units";
import {
  EQUIPMENT_UNIT_MISMATCH_ERROR,
  listAssignableUnits,
  reconcileUnitWithEquipment,
  resolveUnitAssignment,
  unitAssignmentError,
} from "@/lib/property-units/unit-assignment";

/**
 * UNIT-OPS-1: server-side glue between Work Order / Inspection routes and the
 * pure rules in unit-assignment.ts. Every lookup here is scoped to the
 * record's org + Property, and the pure rule re-checks both anyway.
 */

export interface RecordUnitOptions {
  supportsUnits: boolean;
  units: { id: string; unitLabel: string; name: string | null }[];
  // False for a Unit-restricted editor: they may still *create* a
  // Property-wide record, but not move an existing one into/out of it.
  wholeProperty: boolean;
}

export async function getRecordUnitOptions(
  organizationId: string,
  property: { id: string; propertyTypeId: string },
  scope: PropertyScope,
): Promise<RecordUnitOptions> {
  const propertyType = await getPropertyType(organizationId, property.propertyTypeId);
  const supportsUnits = Boolean(propertyType?.supportsUnits);
  if (!supportsUnits) {
    return { supportsUnits, units: [], wholeProperty: true };
  }
  const { units, wholeProperty } = listAssignableUnits(
    scope,
    property.id,
    await listPropertyUnits(organizationId, property.id, { activeOnly: true }),
  );
  return {
    supportsUnits,
    units: units.map((unit) => ({ id: unit.id, unitLabel: unit.unitLabel, name: unit.name })),
    wholeProperty,
  };
}

export type RecordUnitResolution =
  | { ok: true; changed: boolean; propertyUnitId: string | null }
  | { ok: false; status: number; body: { error: string; message: string } };

/**
 * Resolves the Unit a Work Order / Inspection create or update should end up
 * on, enforcing, in order:
 *   1. Equipment consistency (reconcileUnitWithEquipment) — `equipmentUnitId`
 *      is the Unit of the Equipment the record will be linked to after this
 *      write (null for none/Shared).
 *   2. The assignment rule (resolveUnitAssignment): Units supported, Unit
 *      exists/active/same org+Property, caller may access it, Shared moves
 *      need whole-Property access.
 * `requestedUnitId` undefined = the request didn't mention the Unit.
 */
export async function resolveRecordUnit(params: {
  organizationId: string;
  scope: PropertyScope;
  property: { id: string; propertyTypeId: string };
  mode: "create" | "update";
  requestedUnitId: string | null | undefined;
  currentUnitId: string | null;
  equipmentUnitId: string | null;
  recordNoun: string;
}): Promise<RecordUnitResolution> {
  const { organizationId, property, mode, currentUnitId } = params;

  const reconciled = reconcileUnitWithEquipment({
    requestedUnitId: params.requestedUnitId,
    currentUnitId: mode === "update" ? currentUnitId : undefined,
    equipmentUnitId: params.equipmentUnitId,
  });
  if (!reconciled.ok) {
    return { ok: false, status: 400, body: { ...EQUIPMENT_UNIT_MISMATCH_ERROR } };
  }
  const requestedUnitId = reconciled.requestedUnitId;

  const needsLookup = typeof requestedUnitId === "string" && requestedUnitId !== currentUnitId;
  const [propertyType, unitCandidate] = needsLookup
    ? await Promise.all([
        getPropertyType(organizationId, property.propertyTypeId),
        getPropertyUnit(organizationId, property.id, requestedUnitId),
      ])
    : [null, null];

  const decision = resolveUnitAssignment({
    scope: params.scope,
    organizationId,
    propertyId: property.id,
    supportsUnits: Boolean(propertyType?.supportsUnits),
    mode,
    requestedUnitId,
    currentUnitId,
    unitCandidate,
    sharedCreateRequiresWholeProperty: false,
  });

  if (decision === "unchanged") {
    return { ok: true, changed: false, propertyUnitId: currentUnitId };
  }
  if (decision === "allowed") {
    const next = requestedUnitId ?? null;
    return { ok: true, changed: next !== currentUnitId, propertyUnitId: next };
  }
  return { ok: false, ...unitAssignmentError(decision, params.recordNoun) };
}
