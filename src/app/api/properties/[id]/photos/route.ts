import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, canAccessPropertyUnit, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { getFileRecord } from "@/lib/files/files";
import { PROPERTY_FILES_ENTITY_TYPE, PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { getProperty } from "@/lib/properties/properties";
import { COMPONENT_PHOTO_CATEGORY } from "@/lib/property-photos/constants";
import {
  canViewPhotoSource,
  isAllowedGeneralPhotoRequest,
  presentPhoto,
  resolvePhotoSource,
  validatePhotoOwnerBelongsToProperty,
  validatePhotoOwnerExclusivity,
} from "@/lib/property-photos/photo-rules";
import {
  canViewPhotoEquipmentOwner,
  canViewPropertyPhoto,
  createPropertyPhoto,
  listPropertyPhotos,
} from "@/lib/property-photos/property-photos";
import { getPropertyComponent } from "@/lib/property-components/property-components";
import { PROPERTY_COMPONENT_CAPABILITIES } from "@/lib/property-components/constants";
import { getPropertyUnit } from "@/lib/property-units/property-units";
import { createPropertyPhotoSchema } from "@/lib/validation/property-photos";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const photos = await listPropertyPhotos(user.organizationId, id);
  // PHOTO-1: the aggregate gallery — general, Unit, Component and Equipment
  // photos together. Photos are Mixed (brief §24): a photo tied to a
  // specific Unit must respect Unit restriction; a Property-wide
  // (propertyUnitId null) photo stays visible to anyone who can access the
  // property at all. An entity photo is additionally dropped when the viewer
  // lacks that entity's view capability — /api/files/[id] would refuse to
  // serve its image anyway. UNIT-EQUIP-1: and an Equipment photo is dropped
  // when its Equipment belongs to a Unit the viewer can't access.
  const visiblePhotos = photos.filter(
    (photo) =>
      canViewPropertyPhoto(scope, id, photo.propertyUnitId) &&
      canViewPhotoEquipmentOwner(scope, photo) &&
      canViewPhotoSource(capabilityKeys, resolvePhotoSource(photo)),
  );
  return NextResponse.json({
    photos: visiblePhotos.map((photo) => presentPhoto(photo, { userId: user.id, capabilityKeys })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { user, capabilityKeys } = context;
  const canManage = capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS);
  const canUploadComponentPhoto = capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.UPLOAD_PHOTO);
  if (!canManage && !canUploadComponentPhoto) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const property = await getProperty(user.organizationId, id);
  if (!property) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPropertyPhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  // PHOTO-1: at most one owner, and a non-component request must use a
  // general Property category (never "component"/"equipment" by hand).
  if (!validatePhotoOwnerExclusivity(parsed.data).ok) {
    return NextResponse.json({ error: "multiple_owners" }, { status: 400 });
  }
  if (!isAllowedGeneralPhotoRequest(parsed.data)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  // Legacy (ACCESS-1) API compatibility: the UI now uploads Component photos
  // from the Component page, but this route still accepts them.
  // A component-photo-only uploader (no full MANAGE_DOCUMENTS) may only
  // create a "component" photo, always paired with a propertyComponentId
  // belonging to this same property — never a cover photo, unit photo, or
  // any other category.
  if (!canManage) {
    if (
      parsed.data.category !== COMPONENT_PHOTO_CATEGORY ||
      !parsed.data.propertyComponentId ||
      parsed.data.propertyUnitId
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const component = await getPropertyComponent(user.organizationId, parsed.data.propertyComponentId);
    if (!validatePhotoOwnerBelongsToProperty({ organizationId: user.organizationId, propertyId: id }, component).ok) {
      return NextResponse.json({ error: "invalid_component" }, { status: 400 });
    }
  } else if (parsed.data.propertyComponentId) {
    const component = await getPropertyComponent(user.organizationId, parsed.data.propertyComponentId);
    if (!validatePhotoOwnerBelongsToProperty({ organizationId: user.organizationId, propertyId: id }, component).ok) {
      return NextResponse.json({ error: "invalid_component" }, { status: 400 });
    }
  }

  // The referenced file must already be a private upload attached to this
  // property — never an arbitrary file id from another entity.
  const file = await getFileRecord(user.organizationId, parsed.data.fileId);
  if (
    !file ||
    file.relatedEntityType !== PROPERTY_FILES_ENTITY_TYPE ||
    file.relatedEntityId !== id
  ) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  if (parsed.data.propertyUnitId) {
    const unit = await getPropertyUnit(user.organizationId, id, parsed.data.propertyUnitId);
    if (!unit) {
      return NextResponse.json({ error: "invalid_unit" }, { status: 400 });
    }
    if (!canAccessPropertyUnit(scope, id, parsed.data.propertyUnitId)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const photo = await createPropertyPhoto(user.organizationId, id, user.id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property_photo.upload",
    entityType: "property",
    entityId: id,
    after: { photoId: photo.id, category: photo.category, propertyComponentId: photo.propertyComponentId },
  });

  return NextResponse.json({ photo }, { status: 201 });
}
