import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { vendorCategories } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateVendorCategoryInput,
  UpdateVendorCategoryInput,
} from "@/lib/validation/vendor-categories";

export async function listVendorCategories(
  organizationId: string,
  options: { activeOnly?: boolean } = {},
) {
  const condition = options.activeOnly
    ? and(eq(vendorCategories.organizationId, organizationId), eq(vendorCategories.isActive, true))
    : eq(vendorCategories.organizationId, organizationId);

  return db
    .select()
    .from(vendorCategories)
    .where(condition)
    .orderBy(asc(vendorCategories.sortOrder), asc(vendorCategories.name));
}

export async function getVendorCategory(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(vendorCategories)
    .where(and(eq(vendorCategories.id, id), eq(vendorCategories.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createVendorCategory(organizationId: string, input: CreateVendorCategoryInput) {
  const [row] = await db
    .insert(vendorCategories)
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

export async function updateVendorCategory(
  organizationId: string,
  id: string,
  input: UpdateVendorCategoryInput,
) {
  const [row] = await db
    .update(vendorCategories)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(vendorCategories.id, id), eq(vendorCategories.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
