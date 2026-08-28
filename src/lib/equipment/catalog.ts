import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { equipmentCatalogItems } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateEquipmentCatalogItemInput,
  UpdateEquipmentCatalogItemInput,
} from "@/lib/validation/equipment-catalog";

export async function listEquipmentCatalogItems(
  organizationId: string,
  options: { activeOnly?: boolean } = {},
) {
  const condition = options.activeOnly
    ? and(eq(equipmentCatalogItems.organizationId, organizationId), eq(equipmentCatalogItems.isActive, true))
    : eq(equipmentCatalogItems.organizationId, organizationId);

  return db
    .select()
    .from(equipmentCatalogItems)
    .where(condition)
    .orderBy(asc(equipmentCatalogItems.name));
}

export async function getEquipmentCatalogItem(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(equipmentCatalogItems)
    .where(and(eq(equipmentCatalogItems.id, id), eq(equipmentCatalogItems.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createEquipmentCatalogItem(
  organizationId: string,
  input: CreateEquipmentCatalogItemInput,
) {
  const [row] = await db
    .insert(equipmentCatalogItems)
    .values({
      organizationId,
      name: input.name,
      slug: input.slug,
      category: input.category ?? null,
      description: input.description ?? null,
    })
    .returning();
  return row;
}

export async function updateEquipmentCatalogItem(
  organizationId: string,
  id: string,
  input: UpdateEquipmentCatalogItemInput,
) {
  const [row] = await db
    .update(equipmentCatalogItems)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(equipmentCatalogItems.id, id), eq(equipmentCatalogItems.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
