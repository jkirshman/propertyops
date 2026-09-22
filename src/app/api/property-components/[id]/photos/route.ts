import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { isFileStorageConfigured, uploadPrivateFile } from "@/lib/files/files";
import {
  PROPERTY_COMPONENT_CAPABILITIES,
  PROPERTY_COMPONENT_FILES_ENTITY_TYPE,
} from "@/lib/property-components/constants";
import { getPropertyComponent } from "@/lib/property-components/property-components";
import { COMPONENT_PHOTO_CATEGORY } from "@/lib/property-photos/constants";
import { createPropertyPhoto } from "@/lib/property-photos/property-photos";

/**
 * ACCESS-1: the narrow upload path for PROPERTY_COMPONENT_CAPABILITIES.UPLOAD_PHOTO
 * holders (a User, typically) — deliberately calls uploadPrivateFile directly
 * rather than going through POST /api/files, whose per-related-entity-type
 * gate there requires the *full* manage-documents capability for both the
 * "property" and "property_component" related-entity types. An UPLOAD_PHOTO-
 * only actor never holds that, so they could never obtain a fileId through
 * /api/files in the first place. This endpoint is the only way that actor can
 * attach a photo to a Property Component, and it can only ever create a
 * `category: "component"` property_photos row tied to this one component —
 * never a cover photo, never any other category, and this route intentionally
 * has no DELETE handler (component-photo deletion stays MANAGE_DOCUMENTS-only).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { user, capabilityKeys } = context;
  const canManage = capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.MANAGE_DOCUMENTS);
  const canUploadPhoto = capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.UPLOAD_PHOTO);
  if (!canManage && !canUploadPhoto) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id: componentId } = await params;

  const component = await getPropertyComponent(user.organizationId, componentId);
  if (!component) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, component.propertyId)) {
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

  const rawCaption = formData?.get("caption");
  const caption =
    typeof rawCaption === "string" && rawCaption.trim() ? rawCaption.trim().slice(0, 500) : undefined;

  let record;
  try {
    record = await uploadPrivateFile({
      organizationId: user.organizationId,
      uploadedByUserId: user.id,
      file,
      relatedEntityType: PROPERTY_COMPONENT_FILES_ENTITY_TYPE,
      relatedEntityId: componentId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    return NextResponse.json({ error: "invalid_file", message }, { status: 400 });
  }

  // isCover and propertyUnitId are never accepted here, for either capability
  // tier — a component photo is never a candidate for the property's cover
  // photo, and it isn't Unit-tagged.
  const photo = await createPropertyPhoto(user.organizationId, component.propertyId, user.id, {
    fileId: record.id,
    category: COMPONENT_PHOTO_CATEGORY,
    caption,
    propertyComponentId: componentId,
  });

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property_component.photo_upload",
    entityType: "property_component",
    entityId: componentId,
    after: { photoId: photo.id, fileId: record.id },
  });

  return NextResponse.json({ photo }, { status: 201 });
}
