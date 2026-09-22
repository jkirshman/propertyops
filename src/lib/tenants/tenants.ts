import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/db/client";
import { leases, tenants } from "@/db/schema";
import type { PropertyScope } from "@/lib/auth/property-access";
import { buildLeaseScopeCondition } from "@/lib/leases/leases";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreateTenantInput, UpdateTenantInput } from "@/lib/validation/tenants";

export type TenantRow = typeof tenants.$inferSelect;

export interface ListTenantsOptions {
  search?: string;
  isActive?: boolean;
  tenantType?: string;
  /** Filters to tenants with an active or month-to-month lease at this property. */
  propertyId?: string;
  /**
   * ACCESS-1: a Tenant has no propertyId of its own — a Tenant is visible to
   * a scoped (non-unrestricted) user only if it has at least one Lease
   * within that user's (Unit-aware) Property scope. Unrestricted scope is a
   * no-op here.
   */
  scope?: PropertyScope;
}

export async function listTenants(organizationId: string, options: ListTenantsOptions = {}) {
  const conditions = [eq(tenants.organizationId, organizationId)];

  if (options.isActive !== undefined) {
    conditions.push(eq(tenants.isActive, options.isActive));
  }
  if (options.tenantType) {
    conditions.push(eq(tenants.tenantType, options.tenantType));
  }
  if (options.search) {
    const term = `%${options.search.trim()}%`;
    conditions.push(or(ilike(tenants.name, term), ilike(tenants.legalName, term))!);
  }

  if (options.propertyId) {
    const currentLeases = await db
      .select({ tenantId: leases.tenantId })
      .from(leases)
      .where(
        and(
          eq(leases.organizationId, organizationId),
          eq(leases.propertyId, options.propertyId),
          inArray(leases.status, ["active", "month_to_month"]),
        ),
      );
    const tenantIds = [...new Set(currentLeases.map((row) => row.tenantId))];
    if (tenantIds.length === 0) {
      return [];
    }
    conditions.push(inArray(tenants.id, tenantIds));
  }

  if (options.scope && options.scope.kind !== "all") {
    const scopeCondition = buildLeaseScopeCondition(options.scope);
    if (scopeCondition === null) {
      return [];
    }
    const scopedLeaseRows = await db
      .select({ tenantId: leases.tenantId })
      .from(leases)
      .where(and(eq(leases.organizationId, organizationId), scopeCondition));
    const scopedTenantIds = [...new Set(scopedLeaseRows.map((row) => row.tenantId))];
    if (scopedTenantIds.length === 0) {
      return [];
    }
    conditions.push(inArray(tenants.id, scopedTenantIds));
  }

  return db
    .select()
    .from(tenants)
    .where(and(...conditions))
    .orderBy(asc(tenants.name));
}

export async function getTenant(organizationId: string, id: string): Promise<TenantRow | null> {
  const [row] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, id), eq(tenants.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

/**
 * ACCESS-1: used by detail/update/delete routes to decide whether a scoped
 * (non-unrestricted) user may access a specific Tenant — true iff the Tenant
 * has at least one Lease within that user's Unit-aware Property scope.
 * Callers should skip this check entirely for an unrestricted scope.
 */
export async function tenantHasAccessibleLease(
  organizationId: string,
  tenantId: string,
  scope: Extract<PropertyScope, { kind: "scoped" }>,
): Promise<boolean> {
  const scopeCondition = buildLeaseScopeCondition(scope);
  if (scopeCondition === null) {
    return false;
  }
  const [row] = await db
    .select({ id: leases.id })
    .from(leases)
    .where(and(eq(leases.organizationId, organizationId), eq(leases.tenantId, tenantId), scopeCondition))
    .limit(1);
  return Boolean(row);
}

export async function createTenant(organizationId: string, input: CreateTenantInput): Promise<TenantRow> {
  const [row] = await db
    .insert(tenants)
    .values({
      organizationId,
      tenantType: input.tenantType,
      name: input.name,
      legalName: input.legalName ?? null,
      primaryPhone: input.primaryPhone ?? null,
      primaryEmail: input.primaryEmail ?? null,
      website: input.website ?? null,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      country: input.country ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateTenant(
  organizationId: string,
  id: string,
  input: UpdateTenantInput,
): Promise<TenantRow | null> {
  const [row] = await db
    .update(tenants)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(tenants.id, id), eq(tenants.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
