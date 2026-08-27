import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db/client";
import { properties } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreatePropertyInput, UpdatePropertyInput } from "@/lib/validation/properties";

export interface ListPropertiesOptions {
  search?: string;
  propertyTypeId?: string;
  isActive?: boolean;
}

export async function listProperties(organizationId: string, options: ListPropertiesOptions = {}) {
  const conditions = [eq(properties.organizationId, organizationId)];

  if (options.propertyTypeId) {
    conditions.push(eq(properties.propertyTypeId, options.propertyTypeId));
  }

  if (options.isActive !== undefined) {
    conditions.push(eq(properties.isActive, options.isActive));
  }

  if (options.search) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(properties.name, term),
        ilike(properties.propertyCode, term),
        ilike(properties.city, term),
        ilike(properties.addressLine1, term),
      )!,
    );
  }

  return db
    .select()
    .from(properties)
    .where(and(...conditions))
    .orderBy(asc(properties.name));
}

export async function getProperty(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createProperty(organizationId: string, input: CreatePropertyInput) {
  const [row] = await db
    .insert(properties)
    .values({
      organizationId,
      propertyTypeId: input.propertyTypeId,
      name: input.name,
      propertyCode: input.propertyCode ?? null,
      occupancyModel: input.occupancyModel,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      country: input.country ?? null,
      squareFootage: input.squareFootage ?? null,
      yearBuilt: input.yearBuilt ?? null,
      parcelId: input.parcelId ?? null,
      description: input.description ?? null,
      operationalNotes: input.operationalNotes ?? null,
      primaryPhone: input.primaryPhone ?? null,
      primaryEmail: input.primaryEmail ?? null,
    })
    .returning();
  return row;
}

export async function updateProperty(
  organizationId: string,
  id: string,
  input: UpdatePropertyInput,
) {
  const [row] = await db
    .update(properties)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(properties.id, id), eq(properties.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
