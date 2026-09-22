import { recordAuditEvent } from "@/db/audit";
import { uploadPrivateFile } from "@/lib/files/files";
import { createPropertyPhoto } from "@/lib/property-photos/property-photos";
import type { PhotoCategory } from "@/lib/property-photos/constants";

/**
 * PHOTO-1: shared tail of the Equipment and Property Component photo upload
 * routes, run only after the route has authenticated the caller, checked the
 * upload capability and confirmed the owning entity is in an accessible
 * Property. Uses the same private-Blob `files` foundation as every other
 * upload; the file is attached to the owning entity so /api/files/[id]
 * applies that entity's view capability and Property scope.
 */
export async function createEntityPhotoFromUpload(params: {
  organizationId: string;
  userId: string;
  propertyId: string;
  file: File;
  caption: string | undefined;
  category: PhotoCategory;
  owner:
    | { kind: "component"; id: string; filesEntityType: string }
    | { kind: "equipment"; id: string; filesEntityType: string };
  auditEntityType: string;
}) {
  const record = await uploadPrivateFile({
    organizationId: params.organizationId,
    uploadedByUserId: params.userId,
    file: params.file,
    relatedEntityType: params.owner.filesEntityType,
    relatedEntityId: params.owner.id,
  });

  // isCover and propertyUnitId are never set here — an entity photo is never
  // the Property's cover and carries exactly one owner.
  const photo = await createPropertyPhoto(params.organizationId, params.propertyId, params.userId, {
    fileId: record.id,
    category: params.category,
    caption: params.caption,
    ...(params.owner.kind === "component"
      ? { propertyComponentId: params.owner.id }
      : { propertyEquipmentId: params.owner.id }),
  });

  await recordAuditEvent({
    organizationId: params.organizationId,
    actorUserId: params.userId,
    action: `${params.auditEntityType}.photo_upload`,
    entityType: params.auditEntityType,
    entityId: params.owner.id,
    after: { photoId: photo.id, fileId: record.id },
  });

  return photo;
}

/** Reads the optional caption field from a multipart photo upload. */
export function readCaption(formData: FormData | null): string | undefined {
  const raw = formData?.get("caption");
  return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 500) : undefined;
}
