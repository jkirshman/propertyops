import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { inspectionCategories } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateInspectionCategoryInput,
  UpdateInspectionCategoryInput,
} from "@/lib/validation/inspection-categories";

export async function listInspectionCategories(
  organizationId: string,
  options: { activeOnly?: boolean } = {},
) {
  const condition = options.activeOnly
    ? and(eq(inspectionCategories.organizationId, organizationId), eq(inspectionCategories.isActive, true))
    : eq(inspectionCategories.organizationId, organizationId);

  return db
    .select()
    .from(inspectionCategories)
    .where(condition)
    .orderBy(asc(inspectionCategories.sortOrder), asc(inspectionCategories.name));
}

export async function getInspectionCategory(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(inspectionCategories)
    .where(and(eq(inspectionCategories.id, id), eq(inspectionCategories.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createInspectionCategory(
  organizationId: string,
  input: CreateInspectionCategoryInput,
) {
  const [row] = await db
    .insert(inspectionCategories)
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

export async function updateInspectionCategory(
  organizationId: string,
  id: string,
  input: UpdateInspectionCategoryInput,
) {
  const [row] = await db
    .update(inspectionCategories)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(inspectionCategories.id, id), eq(inspectionCategories.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
