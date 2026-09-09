import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { propertyUnits } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreatePropertyUnitInput, UpdatePropertyUnitInput } from "@/lib/validation/property-units";

export type PropertyUnitRow = typeof propertyUnits.$inferSelect;

export async function listPropertyUnits(
  organizationId: string,
  propertyId: string,
  options: { activeOnly?: boolean } = {},
): Promise<PropertyUnitRow[]> {
  const conditions = [
    eq(propertyUnits.organizationId, organizationId),
    eq(propertyUnits.propertyId, propertyId),
  ];
  if (options.activeOnly) {
    conditions.push(eq(propertyUnits.isActive, true));
  }

  return db
    .select()
    .from(propertyUnits)
    .where(and(...conditions))
    .orderBy(asc(propertyUnits.unitLabel));
}

export async function getPropertyUnit(
  organizationId: string,
  propertyId: string,
  id: string,
): Promise<PropertyUnitRow | null> {
  const [row] = await db
    .select()
    .from(propertyUnits)
    .where(
      and(
        eq(propertyUnits.id, id),
        eq(propertyUnits.propertyId, propertyId),
        eq(propertyUnits.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createPropertyUnit(
  organizationId: string,
  propertyId: string,
  input: CreatePropertyUnitInput,
): Promise<PropertyUnitRow> {
  const [row] = await db
    .insert(propertyUnits)
    .values({
      organizationId,
      propertyId,
      unitLabel: input.unitLabel,
      name: input.name ?? null,
      squareFootage: input.squareFootage ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updatePropertyUnit(
  organizationId: string,
  propertyId: string,
  id: string,
  input: UpdatePropertyUnitInput,
): Promise<PropertyUnitRow | null> {
  const [row] = await db
    .update(propertyUnits)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(
      and(
        eq(propertyUnits.id, id),
        eq(propertyUnits.propertyId, propertyId),
        eq(propertyUnits.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
