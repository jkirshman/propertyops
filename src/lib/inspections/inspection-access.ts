import { canAccessPropertyUnit, type PropertyScope } from "@/lib/auth/property-access";
import { getInspection, type InspectionRow } from "@/lib/inspections/inspections";

/**
 * UNIT-OPS-1: the one authoritative Inspection visibility rule — identical
 * semantics to Work Orders and Equipment. Unit ownership lives on the
 * Inspection instance (the scheduled/run row); templates are Unit-agnostic
 * and never affect visibility. `propertyUnitId: null` = Property-wide /
 * Shared, visible to anyone with access to the Property.
 *
 * List, detail, responses, completion, finding conversion, activity, Home,
 * Calendar, and notifications all go through these functions.
 */
export function canAccessInspection(
  scope: PropertyScope,
  inspection: { propertyId: string; propertyUnitId: string | null },
): boolean {
  return canAccessPropertyUnit(scope, inspection.propertyId, inspection.propertyUnitId);
}

export function filterAccessibleInspections<T extends { propertyId: string; propertyUnitId: string | null }>(
  scope: PropertyScope,
  rows: T[],
): T[] {
  return rows.filter((row) => canAccessInspection(scope, row));
}

/** An Inspection only if the scope may see it (404-equivalent null otherwise). */
export async function getAccessibleInspection(
  organizationId: string,
  scope: PropertyScope,
  id: string,
): Promise<InspectionRow | null> {
  const row = await getInspection(organizationId, id);
  return row && canAccessInspection(scope, row) ? row : null;
}
