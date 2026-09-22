import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, listUserIdsWithCapabilityForProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { createNotification } from "@/lib/notifications/notifications";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { buildPropertyNoteCreatedNotification } from "@/lib/properties/notification-events";
import { createPropertyNote, listPropertyNotes } from "@/lib/properties/notes";
import { getProperty } from "@/lib/properties/properties";
import { createPropertyNoteSchema } from "@/lib/validation/property-notes";

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

  const notes = await listPropertyNotes(user.organizationId, id);
  return NextResponse.json({ notes });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_NOTES)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const property = await getProperty(user.organizationId, id);
  if (!property) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPropertyNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const note = await createPropertyNote(user.organizationId, id, user.id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property.note_create",
    entityType: "property",
    entityId: id,
    after: { noteId: note.id },
  });

  const recipientIds = await listUserIdsWithCapabilityForProperty(
    user.organizationId,
    id,
    PROPERTY_CAPABILITIES.MANAGE_NOTES,
  );
  const notification = buildPropertyNoteCreatedNotification({
    id: note.id,
    propertyId: id,
    propertyName: property.name,
    authorDisplayName: user.displayName,
    body: note.body,
  });
  for (const recipientUserId of recipientIds) {
    if (recipientUserId === user.id) continue;
    await createNotification({
      organizationId: user.organizationId,
      recipientUserId,
      actorUserId: user.id,
      ...notification,
    });
  }

  return NextResponse.json({ note }, { status: 201 });
}
