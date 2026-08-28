import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { equipmentTemplateItems, equipmentTemplates } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateEquipmentTemplateInput,
  CreateEquipmentTemplateItemInput,
  UpdateEquipmentTemplateInput,
  UpdateEquipmentTemplateItemInput,
} from "@/lib/validation/equipment-templates";

export async function listEquipmentTemplates(
  organizationId: string,
  options: { activeOnly?: boolean } = {},
) {
  const condition = options.activeOnly
    ? and(eq(equipmentTemplates.organizationId, organizationId), eq(equipmentTemplates.isActive, true))
    : eq(equipmentTemplates.organizationId, organizationId);

  return db.select().from(equipmentTemplates).where(condition).orderBy(asc(equipmentTemplates.name));
}

export async function getEquipmentTemplate(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(equipmentTemplates)
    .where(and(eq(equipmentTemplates.id, id), eq(equipmentTemplates.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createEquipmentTemplate(
  organizationId: string,
  input: CreateEquipmentTemplateInput,
) {
  const [row] = await db
    .insert(equipmentTemplates)
    .values({
      organizationId,
      name: input.name,
      description: input.description ?? null,
    })
    .returning();
  return row;
}

export async function updateEquipmentTemplate(
  organizationId: string,
  id: string,
  input: UpdateEquipmentTemplateInput,
) {
  const [row] = await db
    .update(equipmentTemplates)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(equipmentTemplates.id, id), eq(equipmentTemplates.organizationId, organizationId)))
    .returning();
  return row ?? null;
}

export async function listEquipmentTemplateItems(organizationId: string, templateId: string) {
  return db
    .select()
    .from(equipmentTemplateItems)
    .where(
      and(
        eq(equipmentTemplateItems.organizationId, organizationId),
        eq(equipmentTemplateItems.templateId, templateId),
      ),
    )
    .orderBy(asc(equipmentTemplateItems.sortOrder), asc(equipmentTemplateItems.createdAt));
}

export async function getEquipmentTemplateItem(
  organizationId: string,
  templateId: string,
  itemId: string,
) {
  const [row] = await db
    .select()
    .from(equipmentTemplateItems)
    .where(
      and(
        eq(equipmentTemplateItems.id, itemId),
        eq(equipmentTemplateItems.templateId, templateId),
        eq(equipmentTemplateItems.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createEquipmentTemplateItem(
  organizationId: string,
  templateId: string,
  input: CreateEquipmentTemplateItemInput,
) {
  const [row] = await db
    .insert(equipmentTemplateItems)
    .values({
      organizationId,
      templateId,
      equipmentCatalogItemId: input.equipmentCatalogItemId,
      expectedQuantity: input.expectedQuantity,
      isRequired: input.isRequired,
      notes: input.notes ?? null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row;
}

export async function updateEquipmentTemplateItem(
  organizationId: string,
  templateId: string,
  itemId: string,
  input: UpdateEquipmentTemplateItemInput,
) {
  const [row] = await db
    .update(equipmentTemplateItems)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(
      and(
        eq(equipmentTemplateItems.id, itemId),
        eq(equipmentTemplateItems.templateId, templateId),
        eq(equipmentTemplateItems.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteEquipmentTemplateItem(
  organizationId: string,
  templateId: string,
  itemId: string,
) {
  const [row] = await db
    .delete(equipmentTemplateItems)
    .where(
      and(
        eq(equipmentTemplateItems.id, itemId),
        eq(equipmentTemplateItems.templateId, templateId),
        eq(equipmentTemplateItems.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
