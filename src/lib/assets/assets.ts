import { and, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { assetCounters, assets } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import { formatAssetTag } from "@/lib/assets/numbering";
import { canAccessProperty, type PropertyScope } from "@/lib/auth/property-access";
import type { CreateAssetInput, UpdateAssetInput } from "@/lib/validation/assets";

/**
 * ACCESS-1: an unrestricted (Administrator) scope sees every asset as today.
 * A scoped (Manager/User) role only sees assets clearly assigned to one of
 * their accessible Properties — an unassigned or Person-assigned asset
 * (assignedPropertyId null) is never visible to a scoped role.
 */
export function isAssetVisibleForScope(
  asset: { assignedPropertyId: string | null },
  scope: PropertyScope,
): boolean {
  if (scope.kind === "all") {
    return true;
  }
  return asset.assignedPropertyId !== null && canAccessProperty(scope, asset.assignedPropertyId);
}

async function getNextAssetSequenceNumber(organizationId: string): Promise<number> {
  // Lazily create the counter row (first-ever asset for this org); a
  // concurrent duplicate insert is a safe no-op, and the atomic UPDATE below
  // still serializes correctly against whichever row wins.
  await db.insert(assetCounters).values({ organizationId }).onConflictDoNothing();

  const [row] = await db
    .update(assetCounters)
    .set({ nextNumber: sql`${assetCounters.nextNumber} + 1` })
    .where(eq(assetCounters.organizationId, organizationId))
    .returning({ nextNumber: assetCounters.nextNumber });

  return row.nextNumber - 1;
}

export interface ListAssetsOptions {
  search?: string;
  categoryId?: string;
  status?: string;
  condition?: string;
  assignmentType?: string;
  propertyId?: string;
  personId?: string;
  isActive?: boolean;
  // ACCESS-1 property scoping (see src/lib/auth/property-access.ts):
  // undefined/null = unrestricted (Administrator), no filter. An empty array
  // means the caller has no accessible properties — short-circuits to [].
  // Assets with a null assignedPropertyId (unassigned, or person-assigned)
  // are excluded whenever this filter is applied, never merely "included
  // because IN happens to skip NULLs" — this is deliberate, not incidental.
  propertyIds?: string[] | null;
}

export async function listAssets(organizationId: string, options: ListAssetsOptions = {}) {
  if (options.propertyIds !== undefined && options.propertyIds !== null && options.propertyIds.length === 0) {
    return [];
  }

  const conditions = [eq(assets.organizationId, organizationId)];

  if (options.propertyIds !== undefined && options.propertyIds !== null) {
    conditions.push(isNotNull(assets.assignedPropertyId));
    conditions.push(inArray(assets.assignedPropertyId, options.propertyIds));
  }

  if (options.categoryId) {
    conditions.push(eq(assets.categoryId, options.categoryId));
  }
  if (options.status) {
    conditions.push(eq(assets.status, options.status));
  }
  if (options.condition) {
    conditions.push(eq(assets.condition, options.condition));
  }
  if (options.assignmentType) {
    conditions.push(eq(assets.assignmentType, options.assignmentType));
  }
  if (options.propertyId) {
    conditions.push(eq(assets.assignedPropertyId, options.propertyId));
  }
  if (options.personId) {
    conditions.push(eq(assets.assignedPersonId, options.personId));
  }
  if (options.isActive !== undefined) {
    conditions.push(eq(assets.isActive, options.isActive));
  }
  if (options.search) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(assets.assetTag, term),
        ilike(assets.displayName, term),
        ilike(assets.serialNumber, term),
        ilike(assets.model, term),
      )!,
    );
  }

  return db
    .select()
    .from(assets)
    .where(and(...conditions))
    .orderBy(desc(assets.updatedAt));
}

export async function getAsset(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, id), eq(assets.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createAsset(organizationId: string, input: CreateAssetInput) {
  const sequenceNumber = await getNextAssetSequenceNumber(organizationId);

  const [row] = await db
    .insert(assets)
    .values({
      organizationId,
      assetTag: formatAssetTag(sequenceNumber),
      displayName: input.displayName,
      categoryId: input.categoryId,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      serialNumber: input.serialNumber ?? null,
      status: input.status,
      condition: input.condition,
      acquiredDate: input.acquiredDate ?? null,
      purchaseCost: input.purchaseCost ?? null,
      warrantyExpiration: input.warrantyExpiration ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateAsset(organizationId: string, id: string, input: UpdateAssetInput) {
  const [row] = await db
    .update(assets)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(assets.id, id), eq(assets.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
