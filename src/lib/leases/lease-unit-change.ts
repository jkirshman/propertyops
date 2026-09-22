import { canAccessPropertyUnit, type PropertyScope } from "@/lib/auth/property-access";

/** The minimal shape of a Unit lookup result the decision below needs. */
export interface LeaseUnitCandidate {
  id: string;
  isActive: boolean;
}

export type LeaseUnitChangeDecision = "unchanged" | "invalid_unit" | "forbidden" | "allowed";

/**
 * ACCESS-1A: decides whether a Lease PATCH's requested `propertyUnitId`
 * change is safe to apply. Pure — the caller does the DB lookup
 * (`getPropertyUnit(organizationId, propertyId, requestedUnitId)`, already
 * scoped to this Lease's org+Property) and passes the result in as
 * `unitCandidate` (`null` when that lookup found nothing, which covers both
 * "Unit belongs to a different Property" and "Unit belongs to a different
 * organization" — getPropertyUnit's own WHERE clause already rules those out).
 *
 * Returns "unchanged" (no scope check performed, never denies) in two cases:
 * `requestedUnitId === currentUnitId` (a PATCH that doesn't touch the Unit —
 * a caller who didn't intend to move the Lease can never be denied by a
 * scope check on a Unit they already had access to), and `requestedUnitId`
 * omitted/`null` (clearing the Unit back to property-wide needs no target-Unit
 * check: a null-unit Lease is already visible to anyone who can access the
 * Property at all, whole-property or Unit-restricted alike, and the caller's
 * access to the *existing* record was already verified before this function
 * is ever called).
 */
export function resolveLeaseUnitChangeDecision(
  scope: PropertyScope,
  propertyId: string,
  requestedUnitId: string | null | undefined,
  currentUnitId: string | null,
  unitCandidate: LeaseUnitCandidate | null,
): LeaseUnitChangeDecision {
  if (!requestedUnitId || requestedUnitId === currentUnitId) {
    return "unchanged";
  }
  if (!unitCandidate || !unitCandidate.isActive) {
    return "invalid_unit";
  }
  if (!canAccessPropertyUnit(scope, propertyId, unitCandidate.id)) {
    return "forbidden";
  }
  return "allowed";
}
