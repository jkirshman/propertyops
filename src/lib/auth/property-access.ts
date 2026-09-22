import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { capabilities, roleCapabilities, roles, userPropertyAccess, users } from "@/db/schema";

// ACCESS-1: capability that marks a role's Property/Unit access as
// unrestricted (organization-wide) instead of governed by explicit
// user_property_access rows. Only the Administrator role is seeded with it —
// deliberately a capability rather than a role-name check, so authorization
// stays driven by the capability model rather than a hardcoded role slug.
export const PROPERTY_ACCESS_CAPABILITIES = {
  UNRESTRICTED: "properties.access.unrestricted",
} as const;

export interface PropertyAccessRow {
  propertyId: string;
  // null means whole-property access; a specific id restricts the user to
  // that Unit/Suite only.
  propertyUnitId: string | null;
}

export type PropertyScope =
  | { kind: "all" }
  | { kind: "scoped"; access: PropertyAccessRow[] };

/**
 * Resolves what Properties/Units a user may access. "all" (Administrator,
 * via the unrestricted capability) needs no DB read; every other role is
 * governed entirely by their user_property_access rows — a non-admin user
 * with zero rows resolves to `{ kind: "scoped", access: [] }`, which every
 * helper below treats as "can access nothing" (fail closed).
 */
export async function resolveUserPropertyScope(
  userId: string,
  organizationId: string,
  capabilityKeys: string[],
): Promise<PropertyScope> {
  if (capabilityKeys.includes(PROPERTY_ACCESS_CAPABILITIES.UNRESTRICTED)) {
    return { kind: "all" };
  }

  const rows = await db
    .select({
      propertyId: userPropertyAccess.propertyId,
      propertyUnitId: userPropertyAccess.propertyUnitId,
    })
    .from(userPropertyAccess)
    .where(
      and(eq(userPropertyAccess.organizationId, organizationId), eq(userPropertyAccess.userId, userId)),
    );

  return { kind: "scoped", access: rows };
}

export function canAccessProperty(scope: PropertyScope, propertyId: string): boolean {
  if (scope.kind === "all") {
    return true;
  }
  return scope.access.some((row) => row.propertyId === propertyId);
}

/**
 * `propertyUnitId` is the unit the *record being checked* belongs to (null if
 * the record isn't unit-scoped — a Property-wide record, or a Property with
 * no Units at all). A record with a null unit is visible to anyone who can
 * access the Property at all, whole-property or unit-restricted alike — it
 * isn't leaking another unit's content, so unit-restriction never hides it.
 * A record tied to a specific unit is visible only to a whole-property access
 * row, or a unit-restricted row matching that exact unit.
 */
export function canAccessPropertyUnit(
  scope: PropertyScope,
  propertyId: string,
  propertyUnitId: string | null,
): boolean {
  if (scope.kind === "all") {
    return true;
  }
  const propertyRows = scope.access.filter((row) => row.propertyId === propertyId);
  if (propertyRows.length === 0) {
    return false;
  }
  if (propertyUnitId === null) {
    return true;
  }
  return propertyRows.some((row) => row.propertyUnitId === null || row.propertyUnitId === propertyUnitId);
}

/** `null` = no filter needed (unrestricted); `[]` = accessible to no properties at all. */
export function listAccessiblePropertyIds(scope: PropertyScope): string[] | null {
  if (scope.kind === "all") {
    return null;
  }
  return Array.from(new Set(scope.access.map((row) => row.propertyId)));
}

/**
 * `null` = every unit in this property is accessible (unrestricted, or a
 * whole-property access row for it); `[]` = the property itself isn't
 * accessible, so no unit within it is either.
 */
export function listAccessibleUnitIdsForProperty(
  scope: PropertyScope,
  propertyId: string,
): string[] | null {
  if (scope.kind === "all") {
    return null;
  }
  const rowsForProperty = scope.access.filter((row) => row.propertyId === propertyId);
  if (rowsForProperty.length === 0) {
    return [];
  }
  if (rowsForProperty.some((row) => row.propertyUnitId === null)) {
    return null;
  }
  return rowsForProperty.map((row) => row.propertyUnitId as string);
}

export function isPropertyScopeUnrestricted(scope: PropertyScope): boolean {
  return scope.kind === "all";
}

/** Standard 403 shape used across the app's API routes for a denied request. */
export function forbiddenResponseBody() {
  return { error: "forbidden" } as const;
}

export interface RecipientCandidate {
  id: string;
  // Holds properties.access.unrestricted via their role.
  unrestricted: boolean;
}

export interface RecipientAccessRow extends PropertyAccessRow {
  userId: string;
}

/**
 * UNIT-OPS-1: pure recipient filter — which candidates may see a record at
 * `propertyId` owned by `propertyUnitId` (null = Property-wide / Shared).
 * Each non-unrestricted candidate's own access rows are turned into their
 * PropertyScope and run through canAccessPropertyUnit, so notifications
 * follow exactly the same rule as the record's list/detail pages.
 */
export function selectRecipientsWithPropertyUnitAccess(
  candidates: RecipientCandidate[],
  accessRows: RecipientAccessRow[],
  propertyId: string,
  propertyUnitId: string | null,
): string[] {
  const recipientIds: string[] = [];
  for (const candidate of candidates) {
    const scope: PropertyScope = candidate.unrestricted
      ? { kind: "all" }
      : {
          kind: "scoped",
          access: accessRows
            .filter((row) => row.userId === candidate.id)
            .map((row) => ({ propertyId: row.propertyId, propertyUnitId: row.propertyUnitId })),
        };
    if (canAccessPropertyUnit(scope, propertyId, propertyUnitId)) {
      recipientIds.push(candidate.id);
    }
  }
  return Array.from(new Set(recipientIds));
}

async function listUnrestrictedRoleIds(organizationId: string, roleIds: string[]): Promise<Set<string>> {
  if (roleIds.length === 0) {
    return new Set();
  }
  const rows = await db
    .select({ roleId: roles.id })
    .from(roles)
    .innerJoin(roleCapabilities, eq(roleCapabilities.roleId, roles.id))
    .innerJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
    .where(
      and(
        eq(roles.organizationId, organizationId),
        eq(capabilities.key, PROPERTY_ACCESS_CAPABILITIES.UNRESTRICTED),
        inArray(roles.id, roleIds),
      ),
    );
  return new Set(rows.map((row) => row.roleId));
}

async function resolveRecipients(
  organizationId: string,
  candidateUsers: { id: string; roleId: string }[],
  propertyId: string,
  propertyUnitId: string | null,
): Promise<string[]> {
  if (candidateUsers.length === 0) {
    return [];
  }
  const unrestrictedRoleIds = await listUnrestrictedRoleIds(
    organizationId,
    Array.from(new Set(candidateUsers.map((candidate) => candidate.roleId))),
  );
  const candidates = candidateUsers.map((candidate) => ({
    id: candidate.id,
    unrestricted: unrestrictedRoleIds.has(candidate.roleId),
  }));

  const restrictedIds = candidates.filter((candidate) => !candidate.unrestricted).map((candidate) => candidate.id);
  const accessRows =
    restrictedIds.length > 0
      ? await db
          .select({
            userId: userPropertyAccess.userId,
            propertyId: userPropertyAccess.propertyId,
            propertyUnitId: userPropertyAccess.propertyUnitId,
          })
          .from(userPropertyAccess)
          .where(
            and(
              eq(userPropertyAccess.organizationId, organizationId),
              eq(userPropertyAccess.propertyId, propertyId),
              inArray(userPropertyAccess.userId, restrictedIds),
            ),
          )
      : [];

  return selectRecipientsWithPropertyUnitAccess(candidates, accessRows, propertyId, propertyUnitId);
}

/**
 * UNIT-OPS-1: narrows specific would-be recipients (an assignee, requester,
 * inspector, PM default assignee) to those who can see a record at
 * `propertyId` / `propertyUnitId` — so a notification never carries another
 * Unit's (or another Property's) Work Order / Inspection title to someone
 * who'd get a 404 opening it. Users outside the org are dropped.
 */
export async function filterUserIdsWithPropertyUnitAccess(
  organizationId: string,
  userIds: (string | null | undefined)[],
  propertyId: string,
  propertyUnitId: string | null,
): Promise<string[]> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (ids.length === 0) {
    return [];
  }
  const candidateUsers = await db
    .select({ id: users.id, roleId: users.roleId })
    .from(users)
    .where(and(eq(users.organizationId, organizationId), inArray(users.id, ids)));
  return resolveRecipients(organizationId, candidateUsers, propertyId, propertyUnitId);
}

/** Convenience for the single-recipient case: true iff `userId` passes filterUserIdsWithPropertyUnitAccess. */
export async function canUserAccessPropertyUnit(
  organizationId: string,
  userId: string | null | undefined,
  propertyId: string,
  propertyUnitId: string | null,
): Promise<boolean> {
  if (!userId) {
    return false;
  }
  const allowed = await filterUserIdsWithPropertyUnitAccess(organizationId, [userId], propertyId, propertyUnitId);
  return allowed.includes(userId);
}

/**
 * Active users in the org who both hold `requiredCapability` and can access
 * `propertyId` — the shared recipient-resolution used by Property Note,
 * Vendor submission, and (UNIT-OPS-1) Inspection-findings notifications
 * ("notify Managers/Admins with access to this property"). A role granting
 * `requiredCapability` but not `properties.access.unrestricted` only
 * contributes users who additionally have a matching `user_property_access`
 * row. `propertyUnitId` (default null = a Property-wide record) further
 * limits Unit-restricted users to records of their own Unit(s).
 */
export async function listUserIdsWithCapabilityForProperty(
  organizationId: string,
  propertyId: string,
  requiredCapability: string,
  propertyUnitId: string | null = null,
): Promise<string[]> {
  const capableRoleRows = await db
    .select({ roleId: roles.id })
    .from(roles)
    .innerJoin(roleCapabilities, eq(roleCapabilities.roleId, roles.id))
    .innerJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
    .where(and(eq(roles.organizationId, organizationId), eq(capabilities.key, requiredCapability)));
  const capableRoleIds = capableRoleRows.map((row) => row.roleId);
  if (capableRoleIds.length === 0) {
    return [];
  }

  const candidateUsers = await db
    .select({ id: users.id, roleId: users.roleId })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true),
        inArray(users.roleId, capableRoleIds),
      ),
    );

  return resolveRecipients(organizationId, candidateUsers, propertyId, propertyUnitId);
}
