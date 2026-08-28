import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { assetCategories } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
} from "@/lib/validation/asset-categories";

export async function listAssetCategories(
  organizationId: string,
  options: { activeOnly?: boolean } = {},
) {
  const condition = options.activeOnly
    ? and(eq(assetCategories.organizationId, organizationId), eq(assetCategories.isActive, true))
    : eq(assetCategories.organizationId, organizationId);

  return db
    .select()
    .from(assetCategories)
    .where(condition)
    .orderBy(asc(assetCategories.sortOrder), asc(assetCategories.name));
}

export async function getAssetCategory(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(assetCategories)
    .where(and(eq(assetCategories.id, id), eq(assetCategories.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createAssetCategory(organizationId: string, input: CreateAssetCategoryInput) {
  const [row] = await db
    .insert(assetCategories)
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

export async function updateAssetCategory(
  organizationId: string,
  id: string,
  input: UpdateAssetCategoryInput,
) {
  const [row] = await db
    .update(assetCategories)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(assetCategories.id, id), eq(assetCategories.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
