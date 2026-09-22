import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { files, propertyPhotos } from "@/db/schema";
import { canAccessProperty, canAccessPropertyUnit, type PropertyScope } from "@/lib/auth/property-access";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreatePropertyPhotoInput, UpdatePropertyPhotoInput } from "@/lib/validation/property-photos";

/**
 * ACCESS-1 mixed Unit-scoping for a single photo record. `canAccessPropertyUnit`
 * reads `propertyUnitId` as "the Unit this *record* belongs to" and only
 * special-cases `null` on the *access-row* side (whole-property access) — it
 * has no special case for a `null` *record* Unit. A Property-wide photo
 * (`propertyUnitId === null`) must stay visible to anyone with any access to
 * the property, even a Unit-restricted user, so that case is handled here
 * first rather than by changing the shared helper.
 */
export function canViewPropertyPhoto(
  scope: PropertyScope,
  propertyId: string,
  photoPropertyUnitId: string | null,
): boolean {
  if (photoPropertyUnitId === null) {
    return canAccessProperty(scope, propertyId);
  }
  return canAccessPropertyUnit(scope, propertyId, photoPropertyUnitId);
}

export async function listPropertyPhotos(organizationId: string, propertyId: string) {
  return db
    .select({
      id: propertyPhotos.id,
      propertyId: propertyPhotos.propertyId,
      fileId: propertyPhotos.fileId,
      category: propertyPhotos.category,
      caption: propertyPhotos.caption,
      propertyUnitId: propertyPhotos.propertyUnitId,
      propertyComponentId: propertyPhotos.propertyComponentId,
      isCover: propertyPhotos.isCover,
      createdAt: propertyPhotos.createdAt,
      fileName: files.fileName,
      mimeType: files.mimeType,
    })
    .from(propertyPhotos)
    .innerJoin(files, eq(files.id, propertyPhotos.fileId))
    .where(and(eq(propertyPhotos.organizationId, organizationId), eq(propertyPhotos.propertyId, propertyId)))
    .orderBy(desc(propertyPhotos.isCover), desc(propertyPhotos.createdAt));
}

export async function getPropertyPhoto(organizationId: string, propertyId: string, id: string) {
  const [row] = await db
    .select()
    .from(propertyPhotos)
    .where(
      and(
        eq(propertyPhotos.id, id),
        eq(propertyPhotos.propertyId, propertyId),
        eq(propertyPhotos.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Org-wide cover photos, one per property that has one — powers the Properties list thumbnails. */
export async function listCoverPhotosForOrganization(
  organizationId: string,
  options: { propertyIds?: string[] | null } = {},
) {
  // ACCESS-1: null = unrestricted (no filter, e.g. Administrator); an array
  // scopes to those properties; an empty array short-circuits to no rows
  // rather than issuing a query that (with no IN-list) would match nothing
  // via a subtly different path.
  if (options.propertyIds !== undefined && options.propertyIds !== null && options.propertyIds.length === 0) {
    return [];
  }

  const conditions = [eq(propertyPhotos.organizationId, organizationId), eq(propertyPhotos.isCover, true)];
  if (options.propertyIds !== undefined && options.propertyIds !== null) {
    conditions.push(inArray(propertyPhotos.propertyId, options.propertyIds));
  }

  return db
    .select({
      propertyId: propertyPhotos.propertyId,
      fileId: propertyPhotos.fileId,
      mimeType: files.mimeType,
    })
    .from(propertyPhotos)
    .innerJoin(files, eq(files.id, propertyPhotos.fileId))
    .where(and(...conditions));
}

/** The property's current cover photo, joined to its file, if one is set. */
export async function getCoverPhoto(organizationId: string, propertyId: string) {
  const [row] = await db
    .select({
      id: propertyPhotos.id,
      fileId: propertyPhotos.fileId,
      mimeType: files.mimeType,
    })
    .from(propertyPhotos)
    .innerJoin(files, eq(files.id, propertyPhotos.fileId))
    .where(
      and(
        eq(propertyPhotos.organizationId, organizationId),
        eq(propertyPhotos.propertyId, propertyId),
        eq(propertyPhotos.isCover, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createPropertyPhoto(
  organizationId: string,
  propertyId: string,
  uploadedByUserId: string | null,
  input: CreatePropertyPhotoInput,
) {
  const [row] = await db
    .insert(propertyPhotos)
    .values({
      organizationId,
      propertyId,
      fileId: input.fileId,
      category: input.category,
      caption: input.caption ?? null,
      propertyUnitId: input.propertyUnitId ?? null,
      propertyComponentId: input.propertyComponentId ?? null,
      uploadedByUserId,
    })
    .returning();
  return row;
}

export async function updatePropertyPhoto(
  organizationId: string,
  propertyId: string,
  id: string,
  input: UpdatePropertyPhotoInput,
) {
  const [row] = await db
    .update(propertyPhotos)
    .set(stripUndefined(input))
    .where(
      and(
        eq(propertyPhotos.id, id),
        eq(propertyPhotos.propertyId, propertyId),
        eq(propertyPhotos.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}

/**
 * Exactly one cover photo per property is an application-level invariant, not
 * a DB constraint (matching property_contacts.isPrimary) — unset any prior
 * cover, then set the new one. No transactions on the neon-http driver, so
 * this is two sequential statements rather than one atomic swap; a request
 * failing between them leaves at most a temporarily-uncovered property, never
 * two covers.
 */
export async function setCoverPhoto(organizationId: string, propertyId: string, id: string) {
  await db
    .update(propertyPhotos)
    .set({ isCover: false })
    .where(and(eq(propertyPhotos.organizationId, organizationId), eq(propertyPhotos.propertyId, propertyId)));

  const [row] = await db
    .update(propertyPhotos)
    .set({ isCover: true })
    .where(
      and(
        eq(propertyPhotos.id, id),
        eq(propertyPhotos.propertyId, propertyId),
        eq(propertyPhotos.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
