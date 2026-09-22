import { canAccessPropertyUnit, type PropertyScope } from "@/lib/auth/property-access";
import { getWorkOrder } from "@/lib/work-orders/work-orders";

/**
 * UNIT-OPS-1: the one authoritative Work Order visibility rule, the same one
 * Equipment uses (UNIT-EQUIP-1). A Property-wide / Shared Work Order
 * (`propertyUnitId: null`) is visible to anyone who can access its Property;
 * a Unit-owned one only to unrestricted scopes, whole-Property access rows,
 * or a Unit row for that exact Unit. The rule follows access rows, never role
 * names — a Manager given only a Unit row is Unit-restricted too.
 *
 * Every Work Order read path — list/search/filters, detail, notes,
 * activity, attachments, Home brief, Calendar, notifications — goes through
 * these functions; none re-derives the rule.
 */
export function canAccessWorkOrder(
  scope: PropertyScope,
  workOrder: { propertyId: string; propertyUnitId: string | null },
): boolean {
  return canAccessPropertyUnit(scope, workOrder.propertyId, workOrder.propertyUnitId);
}

export function filterAccessibleWorkOrders<T extends { propertyId: string; propertyUnitId: string | null }>(
  scope: PropertyScope,
  rows: T[],
): T[] {
  return rows.filter((row) => canAccessWorkOrder(scope, row));
}

/**
 * A Work Order only if the scope may see it — null for missing, cross-org,
 * other-Property, and other-Unit alike, so routes answer 404 without
 * distinguishing "doesn't exist" from "not yours".
 */
export async function getAccessibleWorkOrder(organizationId: string, scope: PropertyScope, id: string) {
  const row = await getWorkOrder(organizationId, id);
  return row && canAccessWorkOrder(scope, row) ? row : null;
}

/**
 * For a record that stays visible on its own (a PM occurrence) but links a
 * Work Order the viewer can't access — only reachable when a Shared PM Work
 * Order was later moved into another Unit: drop the link, number, and status.
 */
export function redactHiddenOccurrenceWorkOrder<
  T extends {
    workOrderId: string | null;
    workOrderNumber: string | null;
    workOrderStatus: string | null;
    workOrderPropertyId: string | null;
    workOrderPropertyUnitId: string | null;
  },
>(scope: PropertyScope, occurrence: T) {
  const { workOrderPropertyId, workOrderPropertyUnitId, ...rest } = occurrence;
  const hidden =
    rest.workOrderId !== null &&
    workOrderPropertyId !== null &&
    !canAccessWorkOrder(scope, { propertyId: workOrderPropertyId, propertyUnitId: workOrderPropertyUnitId });
  return hidden ? { ...rest, workOrderId: null, workOrderNumber: null, workOrderStatus: null } : rest;
}
