import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { workOrderCategories } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateWorkOrderCategoryInput,
  UpdateWorkOrderCategoryInput,
} from "@/lib/validation/work-order-categories";

export async function listWorkOrderCategories(
  organizationId: string,
  options: { activeOnly?: boolean } = {},
) {
  const condition = options.activeOnly
    ? and(
        eq(workOrderCategories.organizationId, organizationId),
        eq(workOrderCategories.isActive, true),
      )
    : eq(workOrderCategories.organizationId, organizationId);

  return db
    .select()
    .from(workOrderCategories)
    .where(condition)
    .orderBy(asc(workOrderCategories.sortOrder), asc(workOrderCategories.name));
}

export async function getWorkOrderCategory(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(workOrderCategories)
    .where(and(eq(workOrderCategories.id, id), eq(workOrderCategories.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createWorkOrderCategory(
  organizationId: string,
  input: CreateWorkOrderCategoryInput,
) {
  const [row] = await db
    .insert(workOrderCategories)
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

export async function updateWorkOrderCategory(
  organizationId: string,
  id: string,
  input: UpdateWorkOrderCategoryInput,
) {
  const [row] = await db
    .update(workOrderCategories)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(workOrderCategories.id, id), eq(workOrderCategories.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
