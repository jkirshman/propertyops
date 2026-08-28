import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { assetCounters, assets } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import { formatAssetTag } from "@/lib/assets/numbering";
import type { CreateAssetInput, UpdateAssetInput } from "@/lib/validation/assets";

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
}

export async function listAssets(organizationId: string, options: ListAssetsOptions = {}) {
  const conditions = [eq(assets.organizationId, organizationId)];

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
