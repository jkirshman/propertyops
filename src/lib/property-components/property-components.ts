import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { propertyComponents } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreatePropertyComponentInput,
  UpdatePropertyComponentInput,
} from "@/lib/validation/property-components";

export type PropertyComponentRow = typeof propertyComponents.$inferSelect;

export async function listPropertyComponents(
  organizationId: string,
  propertyId: string,
  options: { activeOnly?: boolean } = {},
): Promise<PropertyComponentRow[]> {
  const conditions = [
    eq(propertyComponents.organizationId, organizationId),
    eq(propertyComponents.propertyId, propertyId),
  ];
  if (options.activeOnly) {
    conditions.push(eq(propertyComponents.isActive, true));
  }

  return db
    .select()
    .from(propertyComponents)
    .where(and(...conditions))
    .orderBy(asc(propertyComponents.componentType));
}

export async function getPropertyComponent(
  organizationId: string,
  id: string,
): Promise<PropertyComponentRow | null> {
  const [row] = await db
    .select()
    .from(propertyComponents)
    .where(and(eq(propertyComponents.id, id), eq(propertyComponents.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createPropertyComponent(
  organizationId: string,
  propertyId: string,
  input: CreatePropertyComponentInput,
): Promise<PropertyComponentRow> {
  const [row] = await db
    .insert(propertyComponents)
    .values({
      organizationId,
      propertyId,
      componentType: input.componentType,
      otherTypeLabel: input.otherTypeLabel ?? null,
      name: input.name ?? null,
      description: input.description ?? null,
      installedDate: input.installedDate ?? null,
      replacementDate: input.replacementDate ?? null,
      expectedUsefulLifeYears: input.expectedUsefulLifeYears ?? null,
      warrantyExpiration: input.warrantyExpiration ?? null,
      vendorId: input.vendorId ?? null,
      condition: input.condition ?? "unknown",
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updatePropertyComponent(
  organizationId: string,
  id: string,
  input: UpdatePropertyComponentInput,
): Promise<PropertyComponentRow | null> {
  const [row] = await db
    .update(propertyComponents)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(propertyComponents.id, id), eq(propertyComponents.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
