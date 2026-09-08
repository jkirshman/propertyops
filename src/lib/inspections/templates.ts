import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { inspectionTemplateItems, inspectionTemplates } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateInspectionTemplateInput,
  UpdateInspectionTemplateInput,
} from "@/lib/validation/inspection-templates";
import type {
  CreateInspectionTemplateItemInput,
  UpdateInspectionTemplateItemInput,
} from "@/lib/validation/inspection-template-items";

export interface ListInspectionTemplatesOptions {
  activeOnly?: boolean;
  categoryId?: string;
  propertyTypeId?: string;
}

export async function listInspectionTemplates(
  organizationId: string,
  options: ListInspectionTemplatesOptions = {},
) {
  const conditions = [eq(inspectionTemplates.organizationId, organizationId)];
  if (options.activeOnly) {
    conditions.push(eq(inspectionTemplates.isActive, true));
  }
  if (options.categoryId) {
    conditions.push(eq(inspectionTemplates.categoryId, options.categoryId));
  }
  if (options.propertyTypeId) {
    conditions.push(eq(inspectionTemplates.propertyTypeId, options.propertyTypeId));
  }

  return db
    .select()
    .from(inspectionTemplates)
    .where(and(...conditions))
    .orderBy(asc(inspectionTemplates.name));
}

export async function getInspectionTemplate(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(inspectionTemplates)
    .where(and(eq(inspectionTemplates.id, id), eq(inspectionTemplates.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createInspectionTemplate(
  organizationId: string,
  input: CreateInspectionTemplateInput,
) {
  const [row] = await db
    .insert(inspectionTemplates)
    .values({
      organizationId,
      categoryId: input.categoryId,
      propertyTypeId: input.propertyTypeId ?? null,
      name: input.name,
      description: input.description ?? null,
    })
    .returning();
  return row;
}

export async function updateInspectionTemplate(
  organizationId: string,
  id: string,
  input: UpdateInspectionTemplateInput,
) {
  const [row] = await db
    .update(inspectionTemplates)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(inspectionTemplates.id, id), eq(inspectionTemplates.organizationId, organizationId)))
    .returning();
  return row ?? null;
}

export async function listInspectionTemplateItems(organizationId: string, templateId: string) {
  return db
    .select()
    .from(inspectionTemplateItems)
    .where(
      and(
        eq(inspectionTemplateItems.organizationId, organizationId),
        eq(inspectionTemplateItems.templateId, templateId),
      ),
    )
    .orderBy(asc(inspectionTemplateItems.sortOrder));
}

export async function getInspectionTemplateItem(
  organizationId: string,
  templateId: string,
  itemId: string,
) {
  const [row] = await db
    .select()
    .from(inspectionTemplateItems)
    .where(
      and(
        eq(inspectionTemplateItems.id, itemId),
        eq(inspectionTemplateItems.templateId, templateId),
        eq(inspectionTemplateItems.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createInspectionTemplateItem(
  organizationId: string,
  templateId: string,
  input: CreateInspectionTemplateItemInput,
) {
  const [row] = await db
    .insert(inspectionTemplateItems)
    .values({
      organizationId,
      templateId,
      label: input.label,
      description: input.description ?? null,
      responseType: input.responseType,
      isRequired: input.isRequired ?? true,
      allowNote: input.allowNote ?? true,
      choices: input.responseType === "choice" ? input.choices ?? null : null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row;
}

export async function updateInspectionTemplateItem(
  organizationId: string,
  templateId: string,
  itemId: string,
  input: UpdateInspectionTemplateItemInput,
) {
  const [row] = await db
    .update(inspectionTemplateItems)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(
      and(
        eq(inspectionTemplateItems.id, itemId),
        eq(inspectionTemplateItems.templateId, templateId),
        eq(inspectionTemplateItems.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteInspectionTemplateItem(
  organizationId: string,
  templateId: string,
  itemId: string,
) {
  const [row] = await db
    .delete(inspectionTemplateItems)
    .where(
      and(
        eq(inspectionTemplateItems.id, itemId),
        eq(inspectionTemplateItems.templateId, templateId),
        eq(inspectionTemplateItems.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
