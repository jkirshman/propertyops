import { hasAnyAdminCapability } from "@/lib/admin/admin-hub-config";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";

export type NavVariant = "admin" | "manager" | "user";

// ACCESS-1: the dividing line between the Manager and User nav experiences.
// property.edit is granted to every seeded Manager-or-above role and to no
// seeded User role (see scripts/seed.ts's MANAGER_CAPABILITY_KEYS vs
// USER_CAPABILITY_KEYS) — a reliable, existing capability rather than a new
// one invented solely to distinguish nav variants.
const MANAGER_OR_ABOVE_CAPABILITY = PROPERTY_CAPABILITIES.EDIT;

/**
 * Resolves which of the three nav experiences a user sees. Capability-driven,
 * not role-name-driven, per this app's authorization convention — a future
 * custom role with the same capability shape gets the same nav.
 */
export function resolveNavVariant(capabilityKeys: string[]): NavVariant {
  if (hasAnyAdminCapability(capabilityKeys)) {
    return "admin";
  }
  if (capabilityKeys.includes(MANAGER_OR_ABOVE_CAPABILITY)) {
    return "manager";
  }
  return "user";
}
