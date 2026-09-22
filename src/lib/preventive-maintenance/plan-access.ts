import { canAccessProperty, type PropertyScope } from "@/lib/auth/property-access";
import { isEquipmentLinkHidden, resolveHiddenEquipmentIds } from "@/lib/equipment/equipment-access";

/**
 * UNIT-EQUIP-1: a PM plan is visible when its Property is (existing ACCESS-1
 * rule) AND, if it targets Equipment, that Equipment is visible too — a plan
 * for Unit B's HVAC is Unit B Equipment detail, so a Unit A-only User doesn't
 * see it at all. Plans with no Equipment, or Property-wide Equipment, are
 * unaffected; Admin/Manager/whole-Property access never triggers a lookup.
 */
export async function canAccessPreventiveMaintenancePlan(
  organizationId: string,
  scope: PropertyScope,
  plan: { propertyId: string; propertyEquipmentId: string | null },
): Promise<boolean> {
  if (!canAccessProperty(scope, plan.propertyId)) {
    return false;
  }
  if (plan.propertyEquipmentId === null) {
    return true;
  }
  const hiddenEquipmentIds = await resolveHiddenEquipmentIds(organizationId, scope);
  return !isEquipmentLinkHidden(hiddenEquipmentIds, plan.propertyEquipmentId);
}

/** List form of the rule above, for plans already limited to accessible Properties. */
export function excludePlansForHiddenEquipment<T extends { propertyEquipmentId: string | null }>(
  plans: T[],
  hiddenEquipmentIds: ReadonlySet<string>,
): T[] {
  return plans.filter((plan) => !isEquipmentLinkHidden(hiddenEquipmentIds, plan.propertyEquipmentId));
}
