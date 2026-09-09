import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { propertyCompanies } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreatePropertyCompanyInput,
  UpdatePropertyCompanyInput,
} from "@/lib/validation/property-companies";

export type PropertyCompanyRow = typeof propertyCompanies.$inferSelect;

export async function listPropertyCompanies(
  organizationId: string,
  options: { activeOnly?: boolean } = {},
): Promise<PropertyCompanyRow[]> {
  const conditions = [eq(propertyCompanies.organizationId, organizationId)];
  if (options.activeOnly) {
    conditions.push(eq(propertyCompanies.isActive, true));
  }

  return db
    .select()
    .from(propertyCompanies)
    .where(and(...conditions))
    .orderBy(asc(propertyCompanies.name));
}

export async function getPropertyCompany(
  organizationId: string,
  id: string,
): Promise<PropertyCompanyRow | null> {
  const [row] = await db
    .select()
    .from(propertyCompanies)
    .where(and(eq(propertyCompanies.id, id), eq(propertyCompanies.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createPropertyCompany(
  organizationId: string,
  input: CreatePropertyCompanyInput,
): Promise<PropertyCompanyRow> {
  const [row] = await db
    .insert(propertyCompanies)
    .values({
      organizationId,
      name: input.name,
      legalName: input.legalName ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updatePropertyCompany(
  organizationId: string,
  id: string,
  input: UpdatePropertyCompanyInput,
): Promise<PropertyCompanyRow | null> {
  const [row] = await db
    .update(propertyCompanies)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(propertyCompanies.id, id), eq(propertyCompanies.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
