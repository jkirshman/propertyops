import { and, desc, eq, isNull, or, type SQL } from "drizzle-orm";

import { db } from "@/db/client";
import { leases } from "@/db/schema";
import type { PropertyScope } from "@/lib/auth/property-access";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreateLeaseInput, UpdateLeaseInput } from "@/lib/validation/leases";

export type LeaseRow = typeof leases.$inferSelect;

/**
 * ACCESS-1 / UNIT-OPS-1: SQL form of canAccessPropertyUnit for Leases. Builds
 * an OR across the user's access rows — a whole-property row
 * (propertyUnitId null) matches any Lease at that property; a
 * unit-restricted row matches Leases on its own Unit AND Leases with no Unit
 * (Property-wide / Shared).
 *
 * UNIT-OPS-1 fixed an inconsistency here: this condition used to hide
 * NULL-unit Leases from Unit-restricted users, while Lease detail, activity,
 * and documents (canAccessPropertyUnit(..., null)) showed them — so a Lease
 * could be missing from the list yet reachable by URL. NULL now means
 * Shared everywhere, matching Equipment / Work Orders / Inspections.
 *
 * Only meaningful for a "scoped" (non-unrestricted) scope — callers check
 * `scope.kind !== "all"` before calling. Returns `null` when the scope grants
 * access to nothing at all (an empty access list), which callers must treat
 * as "match no rows" without running a query.
 */
export function buildLeaseScopeCondition(scope: Extract<PropertyScope, { kind: "scoped" }>): SQL | null {
  if (scope.access.length === 0) {
    return null;
  }
  const rowConditions = scope.access.map((row) =>
    row.propertyUnitId === null
      ? eq(leases.propertyId, row.propertyId)
      : and(
          eq(leases.propertyId, row.propertyId),
          or(eq(leases.propertyUnitId, row.propertyUnitId), isNull(leases.propertyUnitId)),
        ),
  );
  return or(...rowConditions) as SQL;
}

export interface ListLeasesOptions {
  propertyId?: string;
  tenantId?: string;
  status?: string;
  /** ACCESS-1: when provided and not unrestricted, results are limited to Unit-aware accessible leases. */
  scope?: PropertyScope;
}

export async function listLeases(organizationId: string, options: ListLeasesOptions = {}) {
  const conditions = [eq(leases.organizationId, organizationId)];
  if (options.propertyId) conditions.push(eq(leases.propertyId, options.propertyId));
  if (options.tenantId) conditions.push(eq(leases.tenantId, options.tenantId));
  if (options.status) conditions.push(eq(leases.status, options.status));

  if (options.scope && options.scope.kind !== "all") {
    const scopeCondition = buildLeaseScopeCondition(options.scope);
    if (scopeCondition === null) {
      return [];
    }
    conditions.push(scopeCondition);
  }

  return db
    .select()
    .from(leases)
    .where(and(...conditions))
    .orderBy(desc(leases.startDate));
}

export async function getLease(organizationId: string, id: string): Promise<LeaseRow | null> {
  const [row] = await db
    .select()
    .from(leases)
    .where(and(eq(leases.id, id), eq(leases.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createLease(organizationId: string, input: CreateLeaseInput): Promise<LeaseRow> {
  const [row] = await db
    .insert(leases)
    .values({
      organizationId,
      propertyId: input.propertyId,
      tenantId: input.tenantId,
      label: input.label,
      leaseType: input.leaseType,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      noticeDate: input.noticeDate ?? null,
      renewalOptionDate: input.renewalOptionDate ?? null,
      moveInDate: input.moveInDate ?? null,
      moveOutDate: input.moveOutDate ?? null,
      securityDeposit: input.securityDeposit ?? null,
      baseRent: input.baseRent ?? null,
      rentFrequency: input.rentFrequency ?? null,
      squareFootageLeased: input.squareFootageLeased ?? null,
      unitLabel: input.unitLabel ?? null,
      propertyUnitId: input.propertyUnitId ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateLease(
  organizationId: string,
  id: string,
  input: UpdateLeaseInput,
): Promise<LeaseRow | null> {
  const [row] = await db
    .update(leases)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(leases.id, id), eq(leases.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
