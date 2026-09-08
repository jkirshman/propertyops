import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { leases } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreateLeaseInput, UpdateLeaseInput } from "@/lib/validation/leases";

export type LeaseRow = typeof leases.$inferSelect;

export interface ListLeasesOptions {
  propertyId?: string;
  tenantId?: string;
  status?: string;
}

export async function listLeases(organizationId: string, options: ListLeasesOptions = {}) {
  const conditions = [eq(leases.organizationId, organizationId)];
  if (options.propertyId) conditions.push(eq(leases.propertyId, options.propertyId));
  if (options.tenantId) conditions.push(eq(leases.tenantId, options.tenantId));
  if (options.status) conditions.push(eq(leases.status, options.status));

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
