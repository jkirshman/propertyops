import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db/client";
import { propertyEquipment } from "@/db/schema";
import {
  canAccessPropertyUnit,
  listAccessibleUnitIdsForProperty,
  type PropertyScope,
} from "@/lib/auth/property-access";

/**
 * UNIT-EQUIP-1: the one authoritative Equipment visibility rule, layered on
 * ACCESS-1's PropertyScope. Equipment with no Unit (Property-wide / Shared)
 * is visible to anyone who can access its Property — Unit-restricted users
 * included, since shared infrastructure affects every occupant. Equipment
 * owned by a Unit is visible only to unrestricted scopes, whole-Property
 * access rows, or a Unit-restricted row for that exact Unit.
 *
 * Every Equipment read path (and every record that inherits Equipment
 * visibility — photos, service records, documents, activity, PM plans)
 * goes through this function, `filterAccessibleEquipment`, or
 * `resolveHiddenEquipmentIds` below; none re-derives the rule in SQL.
 */
export function canAccessPropertyEquipment(
  scope: PropertyScope,
  equipment: { propertyId: string; propertyUnitId: string | null },
): boolean {
  return canAccessPropertyUnit(scope, equipment.propertyId, equipment.propertyUnitId);
}

export function filterAccessibleEquipment<T extends { propertyId: string; propertyUnitId: string | null }>(
  scope: PropertyScope,
  rows: T[],
): T[] {
  return rows.filter((row) => canAccessPropertyEquipment(scope, row));
}

/**
 * Properties the scope can reach only through Unit-restricted access rows (no
 * whole-Property row) — the only places Equipment can ever be hidden from a
 * user who can otherwise see the Property. Empty for an unrestricted scope.
 */
export function listUnitRestrictedPropertyIds(scope: PropertyScope): string[] {
  if (scope.kind === "all") {
    return [];
  }
  const propertyIds = Array.from(new Set(scope.access.map((row) => row.propertyId)));
  return propertyIds.filter((propertyId) => listAccessibleUnitIdsForProperty(scope, propertyId) !== null);
}

/**
 * Ids of Equipment inside Properties the user CAN access, but owned by a Unit
 * they can't. Used to filter/redact records that merely *reference*
 * Equipment (Work Orders, PM plans, Inspections) and are already
 * Property-scoped by their own queries. Runs no query at all for an
 * unrestricted or whole-Property-only scope — the common case.
 */
export async function resolveHiddenEquipmentIds(
  organizationId: string,
  scope: PropertyScope,
): Promise<Set<string>> {
  const restrictedPropertyIds = listUnitRestrictedPropertyIds(scope);
  if (restrictedPropertyIds.length === 0) {
    return new Set();
  }

  const rows = await db
    .select({
      id: propertyEquipment.id,
      propertyId: propertyEquipment.propertyId,
      propertyUnitId: propertyEquipment.propertyUnitId,
    })
    .from(propertyEquipment)
    .where(
      and(
        eq(propertyEquipment.organizationId, organizationId),
        inArray(propertyEquipment.propertyId, restrictedPropertyIds),
        isNotNull(propertyEquipment.propertyUnitId),
      ),
    );

  return new Set(rows.filter((row) => !canAccessPropertyEquipment(scope, row)).map((row) => row.id));
}

export function isEquipmentLinkHidden(hiddenEquipmentIds: ReadonlySet<string>, equipmentId: string | null): boolean {
  return equipmentId !== null && hiddenEquipmentIds.has(equipmentId);
}

/**
 * For a record that stays visible on its own (a Property-scoped Work Order or
 * Inspection) but references hidden Equipment: drop the reference so no
 * Equipment id/name travels to the client, and flag it so the UI can say the
 * link exists without saying what it is.
 */
export function redactHiddenEquipmentLink<T extends { propertyEquipmentId: string | null }>(
  record: T,
  hiddenEquipmentIds: ReadonlySet<string>,
): T & { propertyEquipmentRestricted: boolean } {
  if (isEquipmentLinkHidden(hiddenEquipmentIds, record.propertyEquipmentId)) {
    return { ...record, propertyEquipmentId: null, propertyEquipmentRestricted: true };
  }
  return { ...record, propertyEquipmentRestricted: false };
}

/** The minimal shape of a Unit lookup result the decision below needs. */
export interface EquipmentUnitCandidate {
  id: string;
  organizationId: string;
  propertyId: string;
  isActive: boolean;
}

export type EquipmentUnitAssignmentDecision =
  | "unchanged"
  | "allowed"
  | "units_not_supported"
  | "invalid_unit"
  | "forbidden";

/**
 * UNIT-EQUIP-1: decides whether a create/update may set Equipment's Unit.
 * Pure — the caller looks the Unit up (`getPropertyUnit`, already scoped to
 * the Equipment's org + Property) and passes the result as `unitCandidate`;
 * the org/Property checks are repeated here so the rule doesn't depend on
 * that lookup's WHERE clause.
 *
 * - `requestedUnitId` undefined on update, or equal to the current Unit, is
 *   "unchanged" — a PATCH that doesn't touch the Unit (including Equipment
 *   left on a since-deactivated Unit) is never blocked by this rule.
 * - A Unit requires a Property type that supports Units, an existing active
 *   Unit of the same org + Property, and access to that Unit.
 * - Property-wide (null) requires whole-Property access, in both directions:
 *   a Unit-restricted editor can't create or move Equipment into the Shared
 *   pool (exposing it to every other Unit), nor claim Shared Equipment for
 *   their own Unit (hiding it from every other Unit).
 */
export function resolveEquipmentUnitAssignment(params: {
  scope: PropertyScope;
  organizationId: string;
  propertyId: string;
  supportsUnits: boolean;
  mode: "create" | "update";
  requestedUnitId: string | null | undefined;
  currentUnitId: string | null;
  unitCandidate: EquipmentUnitCandidate | null;
}): EquipmentUnitAssignmentDecision {
  const { scope, organizationId, propertyId, supportsUnits, mode, currentUnitId, unitCandidate } = params;
  const requestedUnitId = params.requestedUnitId === undefined && mode === "create" ? null : params.requestedUnitId;

  if (requestedUnitId === undefined) {
    return "unchanged";
  }
  if (mode === "update" && requestedUnitId === currentUnitId) {
    return "unchanged";
  }

  const hasWholePropertyAccess = listAccessibleUnitIdsForProperty(scope, propertyId) === null;
  if (requestedUnitId === null || (mode === "update" && currentUnitId === null)) {
    // Into or out of the Shared pool: only whole-Property access decides that.
    if (!hasWholePropertyAccess) {
      return "forbidden";
    }
    if (requestedUnitId === null) {
      return "allowed";
    }
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

const UNIT_ASSIGNMENT_ERROR_MESSAGES: Record<
  Exclude<EquipmentUnitAssignmentDecision, "allowed" | "unchanged">,
  string
> = {
  units_not_supported: "This property type doesn't use Units/Suites, so equipment stays property-wide.",
  invalid_unit: "Select an active Unit/Suite of this property.",
  forbidden: "You don't have access to assign equipment to that Unit/Suite.",
};

/** Response status + body for a non-"allowed"/"unchanged" decision. */
export function equipmentUnitAssignmentError(
  decision: Exclude<EquipmentUnitAssignmentDecision, "allowed" | "unchanged">,
): { status: number; body: { error: string; message: string } } {
  return {
    status: decision === "forbidden" ? 403 : 400,
    body: { error: decision, message: UNIT_ASSIGNMENT_ERROR_MESSAGES[decision] },
  };
}

/**
 * Units an editor may pick from in the Equipment Unit selector: active Units
 * of the Property they can access. Unit-restricted editors get only their
 * own Units, and `allowPropertyWide` false (see resolveEquipmentUnitAssignment).
 */
export function listAssignableEquipmentUnits<T extends { id: string; isActive: boolean }>(
  scope: PropertyScope,
  propertyId: string,
  units: T[],
): { units: T[]; allowPropertyWide: boolean } {
  const accessibleUnitIds = listAccessibleUnitIdsForProperty(scope, propertyId);
  return {
    units: units.filter(
      (unit) => unit.isActive && (accessibleUnitIds === null || accessibleUnitIds.includes(unit.id)),
    ),
    allowPropertyWide: accessibleUnitIds === null,
  };
}
