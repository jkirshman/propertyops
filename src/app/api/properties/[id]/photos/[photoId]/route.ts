import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import {
  getPropertyPhoto,
  setCoverPhoto,
  updatePropertyPhoto,
} from "@/lib/property-photos/property-photos";
import { getPropertyUnit } from "@/lib/property-units/property-units";
import { updatePropertyPhotoSchema } from "@/lib/validation/property-photos";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, photoId } = await params;
  const { user } = context;

  const existing = await getPropertyPhoto(user.organizationId, id, photoId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { isCover?: boolean } | null;

  // "Set as cover" is a distinct action from the metadata-edit path — it
  // enforces the exactly-one-cover invariant centrally in setCoverPhoto,
  // rather than letting an arbitrary PATCH toggle isCover directly.
  if (body?.isCover === true) {
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

  if (parsed.data.propertyUnitId) {
    const unit = await getPropertyUnit(user.organizationId, id, parsed.data.propertyUnitId);
    if (!unit) {
      return NextResponse.json({ error: "invalid_unit" }, { status: 400 });
    }
  }

  const updated = await updatePropertyPhoto(user.organizationId, id, photoId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property_photo.metadata_changed",
    entityType: "property",
    entityId: id,
    before: { category: existing.category, caption: existing.caption },
    after: { category: updated.category, caption: updated.caption },
  });

  return NextResponse.json({ photo: updated });
}
