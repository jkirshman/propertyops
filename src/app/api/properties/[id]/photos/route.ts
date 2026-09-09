import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getFileRecord } from "@/lib/files/files";
import { PROPERTY_FILES_ENTITY_TYPE, PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { getProperty } from "@/lib/properties/properties";
import { createPropertyPhoto, listPropertyPhotos } from "@/lib/property-photos/property-photos";
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
  const photos = await listPropertyPhotos(context.user.organizationId, id);
  return NextResponse.json({ photos });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const property = await getProperty(user.organizationId, id);
  if (!property) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPropertyPhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
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
  }

  const photo = await createPropertyPhoto(user.organizationId, id, user.id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property_photo.upload",
    entityType: "property",
    entityId: id,
    after: { photoId: photo.id, category: photo.category },
  });

  return NextResponse.json({ photo }, { status: 201 });
}
