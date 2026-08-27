import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { propertyTypes } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreatePropertyTypeInput,
  UpdatePropertyTypeInput,
} from "@/lib/validation/property-types";

export async function listPropertyTypes(
  organizationId: string,
  options: { activeOnly?: boolean } = {},
) {
  const condition = options.activeOnly
    ? and(eq(propertyTypes.organizationId, organizationId), eq(propertyTypes.isActive, true))
    : eq(propertyTypes.organizationId, organizationId);

  return db
    .select()
    .from(propertyTypes)
    .where(condition)
    .orderBy(asc(propertyTypes.sortOrder), asc(propertyTypes.name));
}

export async function getPropertyType(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(propertyTypes)
    .where(and(eq(propertyTypes.id, id), eq(propertyTypes.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createPropertyType(organizationId: string, input: CreatePropertyTypeInput) {
  const [row] = await db
    .insert(propertyTypes)
    .values({
      organizationId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row;
}

export async function updatePropertyType(
  organizationId: string,
  id: string,
  input: UpdatePropertyTypeInput,
) {
  const [row] = await db
    .update(propertyTypes)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(propertyTypes.id, id), eq(propertyTypes.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
