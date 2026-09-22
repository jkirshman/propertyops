import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { EQUIPMENT_CAPABILITIES, PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE } from "@/lib/equipment/constants";
import { canAccessPropertyEquipment } from "@/lib/equipment/equipment-access";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { isFileStorageConfigured } from "@/lib/files/files";
import { EQUIPMENT_PHOTO_CATEGORY } from "@/lib/property-photos/constants";
import { createEntityPhotoFromUpload, readCaption } from "@/lib/property-photos/entity-photo-upload";
import { canUploadEntityPhoto, presentPhoto } from "@/lib/property-photos/photo-rules";
import { listEquipmentPhotos } from "@/lib/property-photos/property-photos";

/** PHOTO-1: the Equipment record's own Photos tab. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { user, capabilityKeys } = context;
  if (!capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id: equipmentId } = await params;
  const equipment = await getPropertyEquipment(user.organizationId, equipmentId);
  if (!equipment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessPropertyEquipment(scope, equipment)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rows = await listEquipmentPhotos(user.organizationId, equipmentId);
  return NextResponse.json({
    photos: rows.map((row) => presentPhoto(row, { userId: user.id, capabilityKeys })),
  });
}

/**
 * PHOTO-1: attach a condition photo directly to an Equipment record. Open to
 * EQUIPMENT_CAPABILITIES.MANAGE_DOCUMENTS (Manager/Admin) and the narrower
 * UPLOAD_PHOTO (scoped User) — the same two-tier shape as Component photos.
 * The Equipment must be in the caller's organization (org-scoped lookup) and
 * in a Property they can access; the photo is always created on that
 * Equipment's own Property, so it can never point at an unrelated entity.
 * No cover, no Unit tag, no DELETE handler.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { user, capabilityKeys } = context;
  if (!canUploadEntityPhoto(capabilityKeys, "equipment")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id: equipmentId } = await params;

  const equipment = await getPropertyEquipment(user.organizationId, equipmentId);
  if (!equipment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessPropertyEquipment(scope, equipment)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!isFileStorageConfigured()) {
    return NextResponse.json({ error: "file_storage_not_configured" }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  let photo;
  try {
    photo = await createEntityPhotoFromUpload({
      organizationId: user.organizationId,
      userId: user.id,
      propertyId: equipment.propertyId,
      file,
      caption: readCaption(formData),
      category: EQUIPMENT_PHOTO_CATEGORY,
      owner: { kind: "equipment", id: equipmentId, filesEntityType: PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE },
      auditEntityType: PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    return NextResponse.json({ error: "invalid_file", message }, { status: 400 });
  }

  return NextResponse.json({ photo }, { status: 201 });
}
