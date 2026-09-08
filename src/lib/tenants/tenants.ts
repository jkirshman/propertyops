import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/db/client";
import { leases, tenants } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreateTenantInput, UpdateTenantInput } from "@/lib/validation/tenants";

export type TenantRow = typeof tenants.$inferSelect;

export interface ListTenantsOptions {
  search?: string;
  isActive?: boolean;
  tenantType?: string;
  /** Filters to tenants with an active or month-to-month lease at this property. */
  propertyId?: string;
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
