import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessPropertyUnit, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE } from "@/lib/equipment/constants";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import { PROPERTY_COMPONENT_FILES_ENTITY_TYPE } from "@/lib/property-components/constants";
import { GENERAL_PHOTO_CATEGORIES } from "@/lib/property-photos/constants";
import {
  canBeCoverPhoto,
  canViewPhotoSource,
  resolvePhotoEditPermission,
  resolvePhotoSource,
} from "@/lib/property-photos/photo-rules";
import {
  canViewPhotoEquipmentOwner,
  canViewPropertyPhoto,
  getPropertyPhoto,
  setCoverPhoto,
  updatePropertyPhoto,
} from "@/lib/property-photos/property-photos";
import { getPropertyUnit } from "@/lib/property-units/property-units";
import { updatePropertyPhotoSchema } from "@/lib/validation/property-photos";

/**
 * Photo metadata edits for every photo source (PHOTO-1). Who may do what is
 * decided by resolvePhotoEditPermission:
 * - "full" (Manager/Admin): caption, general category, Unit tag, cover.
 * - "caption_only" (the uploader of a Component/Equipment photo who holds
 *   the matching upload capability — a scoped User): caption only.
 * - otherwise 403. There is no photo delete.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id, photoId } = await params;
  const { user, capabilityKeys } = context;

  const existing = await getPropertyPhoto(user.organizationId, id, photoId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const source = resolvePhotoSource(existing);
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canViewPropertyPhoto(scope, id, existing.propertyUnitId) || !canViewPhotoSource(capabilityKeys, source)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.propertyEquipmentId) {
    // Fail closed: an Equipment photo whose Equipment can't be found is hidden too.
    const equipment = await getPropertyEquipment(user.organizationId, existing.propertyEquipmentId);
    if (
      !equipment ||
      !canViewPhotoEquipmentOwner(scope, { ...existing, equipmentPropertyUnitId: equipment.propertyUnitId })
    ) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  const permission = resolvePhotoEditPermission({
    capabilityKeys,
    userId: user.id,
    source,
    uploadedByUserId: existing.uploadedByUserId,
  });
  if (permission === "none") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  // "Set as cover" is a distinct action from the metadata-edit path — it
  // enforces the exactly-one-cover invariant centrally in setCoverPhoto,
  // rather than letting an arbitrary PATCH toggle isCover directly.
  if (body?.isCover === true) {
    if (permission !== "full") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    // PHOTO-1: Equipment/Component photos are never the Property's cover.
    if (!canBeCoverPhoto(source)) {
      return NextResponse.json({ error: "not_cover_eligible" }, { status: 400 });
    }
    const updated = await setCoverPhoto(user.organizationId, id, photoId);
    if (!updated) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "property_photo.cover_changed",
      entityType: "property",
      entityId: id,
      before: { previousCoverPhotoId: existing.isCover ? existing.id : null },
      after: { coverPhotoId: updated.id },
    });
    return NextResponse.json({ photo: updated });
  }

  const parsed = updatePropertyPhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const changesCategoryOrUnit = parsed.data.category !== undefined || parsed.data.propertyUnitId !== undefined;
  if (permission === "caption_only" && changesCategoryOrUnit) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const isEntityPhoto = source === "component" || source === "equipment";
  if (isEntityPhoto && changesCategoryOrUnit) {
    // An entity photo's category is fixed by its owner, and it can't also
    // carry a Unit (single-owner rule).
    return NextResponse.json({ error: "entity_photo_fields_fixed" }, { status: 400 });
  }
  if (
    parsed.data.category !== undefined &&
    !(GENERAL_PHOTO_CATEGORIES as readonly string[]).includes(parsed.data.category)
  ) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
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

  const updated = await updatePropertyPhoto(user.organizationId, id, photoId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Logged against the owning entity so it shows in that entity's Activity.
  const auditTarget =
    source === "equipment"
      ? { entityType: PROPERTY_EQUIPMENT_FILES_ENTITY_TYPE, entityId: existing.propertyEquipmentId! }
      : source === "component"
        ? { entityType: PROPERTY_COMPONENT_FILES_ENTITY_TYPE, entityId: existing.propertyComponentId! }
        : { entityType: "property", entityId: id };
  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: source === "property" || source === "unit" ? "property_photo.metadata_changed" : `${auditTarget.entityType}.photo_metadata_changed`,
    ...auditTarget,
    before: { photoId: existing.id, category: existing.category, caption: existing.caption },
    after: { photoId: updated.id, category: updated.category, caption: updated.caption },
  });

  return NextResponse.json({ photo: updated });
}
