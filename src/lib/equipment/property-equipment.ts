import { and, asc, eq, or } from "drizzle-orm";

import { db } from "@/db/client";
import { properties, propertyEquipment } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreatePropertyEquipmentInput,
  UpdatePropertyEquipmentInput,
} from "@/lib/validation/property-equipment";

export async function listPropertyEquipment(
  organizationId: string,
  propertyId: string,
  options: { activeOnly?: boolean } = {},
) {
  const conditions = [
    eq(propertyEquipment.organizationId, organizationId),
    eq(propertyEquipment.propertyId, propertyId),
  ];
  if (options.activeOnly) {
    conditions.push(eq(propertyEquipment.isActive, true));
  }

  return db
    .select()
    .from(propertyEquipment)
    .where(and(...conditions))
    .orderBy(asc(propertyEquipment.displayName));
}

// Org-wide (unlike listPropertyEquipment, which is single-property) — powers
// the Home App Brief's "Equipment needing attention" section.
export async function listPropertyEquipmentNeedingAttention(organizationId: string) {
  return db
    .select({
      id: propertyEquipment.id,
      displayName: propertyEquipment.displayName,
      condition: propertyEquipment.condition,
      status: propertyEquipment.status,
      propertyId: propertyEquipment.propertyId,
      propertyName: properties.name,
    })
    .from(propertyEquipment)
    .innerJoin(properties, eq(properties.id, propertyEquipment.propertyId))
    .where(
      and(
        eq(propertyEquipment.organizationId, organizationId),
        eq(propertyEquipment.isActive, true),
        or(eq(propertyEquipment.condition, "poor"), eq(propertyEquipment.status, "out_of_service")),
      ),
    )
    .orderBy(asc(properties.name), asc(propertyEquipment.displayName));
}

export async function getPropertyEquipment(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(propertyEquipment)
    .where(and(eq(propertyEquipment.id, id), eq(propertyEquipment.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createPropertyEquipment(
  organizationId: string,
  propertyId: string,
  input: CreatePropertyEquipmentInput,
) {
  const [row] = await db
    .insert(propertyEquipment)
    .values({
      organizationId,
      propertyId,
      equipmentCatalogItemId: input.equipmentCatalogItemId,
      displayName: input.displayName,
      equipmentTag: input.equipmentTag ?? null,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      serialNumber: input.serialNumber ?? null,
      installedDate: input.installedDate ?? null,
      manufactureYear: input.manufactureYear ?? null,
      locationInProperty: input.locationInProperty ?? null,
      quantity: input.quantity ?? 1,
      status: input.status ?? "active",
      condition: input.condition ?? "unknown",
      expectedReplacementDate: input.expectedReplacementDate ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updatePropertyEquipment(
  organizationId: string,
  id: string,
  input: UpdatePropertyEquipmentInput,
) {
  const [row] = await db
    .update(propertyEquipment)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(propertyEquipment.id, id), eq(propertyEquipment.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
