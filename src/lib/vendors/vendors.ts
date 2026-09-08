import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/db/client";
import { vendorCategories, vendorCategoryLinks, vendorPropertyCoverage, vendors } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreateVendorInput, UpdateVendorInput } from "@/lib/validation/vendors";

export type VendorRow = typeof vendors.$inferSelect;
export interface VendorCategorySummary {
  id: string;
  name: string;
}
export type VendorWithCategories = VendorRow & { categories: VendorCategorySummary[] };

export async function attachCategories(
  organizationId: string,
  rows: VendorRow[],
): Promise<VendorWithCategories[]> {
  if (rows.length === 0) {
    return [];
  }

  const links = await db
    .select({
      vendorId: vendorCategoryLinks.vendorId,
      categoryId: vendorCategories.id,
      categoryName: vendorCategories.name,
    })
    .from(vendorCategoryLinks)
    .innerJoin(vendorCategories, eq(vendorCategories.id, vendorCategoryLinks.categoryId))
    .where(
      and(
        eq(vendorCategoryLinks.organizationId, organizationId),
        inArray(
          vendorCategoryLinks.vendorId,
          rows.map((row) => row.id),
        ),
      ),
    );

  const categoriesByVendorId = new Map<string, VendorCategorySummary[]>();
  for (const link of links) {
    const list = categoriesByVendorId.get(link.vendorId) ?? [];
    list.push({ id: link.categoryId, name: link.categoryName });
    categoriesByVendorId.set(link.vendorId, list);
  }

  return rows.map((row) => ({ ...row, categories: categoriesByVendorId.get(row.id) ?? [] }));
}

async function replaceVendorCategories(organizationId: string, vendorId: string, categoryIds: string[]) {
  await db
    .delete(vendorCategoryLinks)
    .where(and(eq(vendorCategoryLinks.organizationId, organizationId), eq(vendorCategoryLinks.vendorId, vendorId)));

  if (categoryIds.length === 0) {
    return;
  }

  await db
    .insert(vendorCategoryLinks)
    .values(categoryIds.map((categoryId) => ({ organizationId, vendorId, categoryId })))
    .onConflictDoNothing({ target: [vendorCategoryLinks.vendorId, vendorCategoryLinks.categoryId] });
}

export interface ListVendorsOptions {
  search?: string;
  isActive?: boolean;
  isPreferred?: boolean;
  categoryId?: string;
  propertyId?: string;
}

export async function listVendors(
  organizationId: string,
  options: ListVendorsOptions = {},
): Promise<VendorWithCategories[]> {
  const conditions = [eq(vendors.organizationId, organizationId)];

  if (options.isActive !== undefined) {
    conditions.push(eq(vendors.isActive, options.isActive));
  }
  if (options.isPreferred !== undefined) {
    conditions.push(eq(vendors.isPreferred, options.isPreferred));
  }
  if (options.search) {
    const term = `%${options.search.trim()}%`;
    conditions.push(or(ilike(vendors.name, term), ilike(vendors.legalName, term))!);
  }

  if (options.categoryId) {
    const rows = await db
      .select({ vendorId: vendorCategoryLinks.vendorId })
      .from(vendorCategoryLinks)
      .where(
        and(
          eq(vendorCategoryLinks.organizationId, organizationId),
          eq(vendorCategoryLinks.categoryId, options.categoryId),
        ),
      );
    const ids = rows.map((row) => row.vendorId);
    if (ids.length === 0) {
      return [];
    }
    conditions.push(inArray(vendors.id, ids));
  }

  if (options.propertyId) {
    const coverageRows = await db
      .select({ vendorId: vendorPropertyCoverage.vendorId })
      .from(vendorPropertyCoverage)
      .where(
        and(
          eq(vendorPropertyCoverage.organizationId, organizationId),
          eq(vendorPropertyCoverage.propertyId, options.propertyId),
        ),
      );
    const coveredIds = coverageRows.map((row) => row.vendorId);
    conditions.push(
      coveredIds.length > 0
        ? or(eq(vendors.coverageMode, "all"), inArray(vendors.id, coveredIds))!
        : eq(vendors.coverageMode, "all"),
    );
  }

  const rows = await db.select().from(vendors).where(and(...conditions)).orderBy(asc(vendors.name));
  return attachCategories(organizationId, rows);
}

export async function getVendor(organizationId: string, id: string): Promise<VendorRow | null> {
  const [row] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, id), eq(vendors.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function getVendorWithCategories(
  organizationId: string,
  id: string,
): Promise<VendorWithCategories | null> {
  const row = await getVendor(organizationId, id);
  if (!row) {
    return null;
  }
  const [withCategories] = await attachCategories(organizationId, [row]);
  return withCategories;
}

export async function createVendor(organizationId: string, input: CreateVendorInput): Promise<VendorRow> {
  const [row] = await db
    .insert(vendors)
    .values({
      organizationId,
      name: input.name,
      legalName: input.legalName ?? null,
      isPreferred: input.isPreferred ?? false,
      primaryPhone: input.primaryPhone ?? null,
      primaryEmail: input.primaryEmail ?? null,
      website: input.website ?? null,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      country: input.country ?? null,
      accountNumber: input.accountNumber ?? null,
      notes: input.notes ?? null,
      coverageMode: input.coverageMode,
      insuranceExpiresAt: input.insuranceExpiresAt ?? null,
      licenseExpiresAt: input.licenseExpiresAt ?? null,
      contractExpiresAt: input.contractExpiresAt ?? null,
    })
    .returning();

  if (input.categoryIds && input.categoryIds.length > 0) {
    await replaceVendorCategories(organizationId, row.id, input.categoryIds);
  }

  return row;
}

export async function updateVendor(
  organizationId: string,
  id: string,
  input: UpdateVendorInput,
): Promise<VendorRow | null> {
  const { categoryIds, ...fields } = input;

  const [row] = await db
    .update(vendors)
    .set({ ...stripUndefined(fields), updatedAt: new Date() })
    .where(and(eq(vendors.id, id), eq(vendors.organizationId, organizationId)))
    .returning();

  if (!row) {
    return null;
  }

  if (categoryIds !== undefined) {
    await replaceVendorCategories(organizationId, id, categoryIds);
  }

  return row;
}
