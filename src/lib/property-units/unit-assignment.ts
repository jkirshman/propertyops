import {
  canAccessPropertyUnit,
  listAccessibleUnitIdsForProperty,
  type PropertyScope,
} from "@/lib/auth/property-access";

/**
 * UNIT-OPS-1: the one Unit-assignment rule for every Unit-ownable
 * operational record (Equipment, Work Orders, Inspections). Pure — callers
 * do the lookups (see lib/property-units/record-units.ts) and pass results in.
 *
 * NULL-unit semantics everywhere: `propertyUnitId: null` = Property-wide /
 * Shared, visible to anyone who can access the Property at all (including
 * Unit-restricted users). A set Unit is visible only to unrestricted scopes,
 * whole-Property access rows, or a Unit row for that exact Unit — see
 * `canAccessPropertyUnit`.
 */

/** The minimal shape of a Unit lookup result the decision below needs. */
export interface UnitCandidate {
  id: string;
  organizationId: string;
  propertyId: string;
  isActive: boolean;
}

export type UnitAssignmentDecision = "unchanged" | "allowed" | "units_not_supported" | "invalid_unit" | "forbidden";

export function hasWholePropertyAccess(scope: PropertyScope, propertyId: string): boolean {
  return listAccessibleUnitIdsForProperty(scope, propertyId) === null;
}

/**
 * Decides whether a create/update may set a record's Unit.
 *
 * - `requestedUnitId` undefined on update, or equal to the current Unit, is
 *   "unchanged" — a PATCH that doesn't move the record (including one left on
 *   a since-deactivated Unit) is never blocked here. On create, undefined
 *   means Property-wide.
 * - A Unit requires a Property type that supports Units, an existing active
 *   Unit of the same org + Property, and access to that Unit.
 * - Moving an existing record into or out of Property-wide requires
 *   whole-Property access: a Unit-restricted editor can't expose their Unit's
 *   record to every other Unit, nor claim a Shared record for their own Unit
 *   (hiding it from every other Unit).
 * - Creating a new Property-wide record: `sharedCreateRequiresWholeProperty`
 *   decides. Equipment (UNIT-EQUIP-1) says yes — shared infrastructure is
 *   inventoried by whole-Property staff. Work Orders / Inspections say no —
 *   any occupant may report a shared problem (parking lot light out).
 */
export function resolveUnitAssignment(params: {
  scope: PropertyScope;
  organizationId: string;
  propertyId: string;
  supportsUnits: boolean;
  mode: "create" | "update";
  requestedUnitId: string | null | undefined;
  currentUnitId: string | null;
  unitCandidate: UnitCandidate | null;
  sharedCreateRequiresWholeProperty: boolean;
}): UnitAssignmentDecision {
  const { scope, organizationId, propertyId, supportsUnits, mode, currentUnitId, unitCandidate } = params;
  const requestedUnitId = params.requestedUnitId === undefined && mode === "create" ? null : params.requestedUnitId;

  if (requestedUnitId === undefined) {
    return "unchanged";
  }
  if (mode === "update" && requestedUnitId === currentUnitId) {
    return "unchanged";
  }

  const wholeProperty = hasWholePropertyAccess(scope, propertyId);
  if (requestedUnitId === null) {
    if (mode === "create" && !params.sharedCreateRequiresWholeProperty) {
      return "allowed";
    }
    return wholeProperty ? "allowed" : "forbidden";
  }
  if (mode === "update" && currentUnitId === null && !wholeProperty) {
    return "forbidden";
  }

  if (!supportsUnits) {
    return "units_not_supported";
  }
  if (
    !unitCandidate ||
    unitCandidate.id !== requestedUnitId ||
    unitCandidate.organizationId !== organizationId ||
    unitCandidate.propertyId !== propertyId ||
    !unitCandidate.isActive
  ) {
    return "invalid_unit";
  }
  if (!canAccessPropertyUnit(scope, propertyId, requestedUnitId)) {
    return "forbidden";
  }
  return "allowed";
}

export type UnitAssignmentFailure = Exclude<UnitAssignmentDecision, "allowed" | "unchanged">;

/** Response status + body for a failed decision; `recordNoun` e.g. "equipment", "work orders". */
export function unitAssignmentError(
  decision: UnitAssignmentFailure,
  recordNoun: string,
): { status: number; body: { error: string; message: string } } {
  const messages: Record<UnitAssignmentFailure, string> = {
    units_not_supported: `This property type doesn't use Units/Suites, so ${recordNoun} stay property-wide.`,
    invalid_unit: "Select an active Unit/Suite of this property.",
    forbidden: `You don't have access to assign ${recordNoun} to that Unit/Suite.`,
  };
  return {
    status: decision === "forbidden" ? 403 : 400,
    body: { error: decision, message: messages[decision] },
  };
}

export type EquipmentUnitReconciliation =
  | { ok: true; requestedUnitId: string | null | undefined }
  | { ok: false };

/**
 * UNIT-OPS-1: keeps a Work Order's / Inspection's Unit consistent with its
 * linked Equipment.
 *
 * - No Equipment, or Shared Equipment: the record may be Shared or any Unit
 *   (a shared water main can still cause a leak inside one Unit), so the
 *   request passes through unchanged.
 * - Unit-owned Equipment: the record must be on that same Unit. When the
 *   request doesn't name a Unit, the Equipment's Unit is adopted
 *   automatically (this is how selecting Unit A's Equipment "sets" Unit A,
 *   and how generated records inherit it); an explicit different Unit —
 *   including explicit Shared — is a mismatch and is rejected.
 *
 * `currentUnitId` (update only) lets "adopt the Equipment's Unit" collapse to
 * `undefined` (unchanged) when the record is already there.
 */
export function reconcileUnitWithEquipment(params: {
  requestedUnitId: string | null | undefined;
  currentUnitId: string | null | undefined;
  equipmentUnitId: string | null;
}): EquipmentUnitReconciliation {
  const { requestedUnitId, currentUnitId, equipmentUnitId } = params;
  if (equipmentUnitId === null) {
    return { ok: true, requestedUnitId };
  }
  if (requestedUnitId === undefined) {
    return { ok: true, requestedUnitId: currentUnitId === equipmentUnitId ? undefined : equipmentUnitId };
  }
  return requestedUnitId === equipmentUnitId ? { ok: true, requestedUnitId } : { ok: false };
}

export const EQUIPMENT_UNIT_MISMATCH_ERROR = {
  error: "equipment_unit_mismatch",
  message: "The linked equipment belongs to a different Unit/Suite. Match the Unit/Suite to the equipment, or link different equipment.",
} as const;

/**
 * UNIT-OPS-1: the Unit of a system-generated Work Order (PM plan, converted
 * Inspection finding). Unit-owned Equipment always wins so the generated
 * Work Order can never contradict its Equipment; otherwise it inherits the
 * source record's own Unit (an Inspection's), or Shared.
 */
export function deriveGeneratedWorkOrderUnitId(params: {
  sourceUnitId: string | null;
  equipmentUnitId: string | null;
}): string | null {
  return params.equipmentUnitId ?? params.sourceUnitId;
}

/**
 * Unit selector options for one Property: active Units the editor can
 * access. `wholeProperty` false means the editor is Unit-restricted — the UI
 * uses it to decide whether Shared can be chosen/changed (see
 * resolveUnitAssignment).
 */
export function listAssignableUnits<T extends { id: string; isActive: boolean }>(
  scope: PropertyScope,
  propertyId: string,
  units: T[],
): { units: T[]; wholeProperty: boolean } {
  const accessibleUnitIds = listAccessibleUnitIdsForProperty(scope, propertyId);
  return {
    units: units.filter(
      (unit) => unit.isActive && (accessibleUnitIds === null || accessibleUnitIds.includes(unit.id)),
    ),
    wholeProperty: accessibleUnitIds === null,
  };
}
