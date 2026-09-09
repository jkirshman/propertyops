import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { files, propertyPhotos } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreatePropertyPhotoInput, UpdatePropertyPhotoInput } from "@/lib/validation/property-photos";

export async function listPropertyPhotos(organizationId: string, propertyId: string) {
  return db
    .select({
      id: propertyPhotos.id,
      propertyId: propertyPhotos.propertyId,
      fileId: propertyPhotos.fileId,
      category: propertyPhotos.category,
      caption: propertyPhotos.caption,
      propertyUnitId: propertyPhotos.propertyUnitId,
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
export async function listCoverPhotosForOrganization(organizationId: string) {
  return db
    .select({
      propertyId: propertyPhotos.propertyId,
      fileId: propertyPhotos.fileId,
      mimeType: files.mimeType,
    })
    .from(propertyPhotos)
    .innerJoin(files, eq(files.id, propertyPhotos.fileId))
    .where(and(eq(propertyPhotos.organizationId, organizationId), eq(propertyPhotos.isCover, true)));
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
