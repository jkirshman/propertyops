import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { createPropertyContact, listPropertyContacts } from "@/lib/properties/contacts";
import { PROPERTY_CAPABILITIES, USER_CREATABLE_CONTACT_TYPES } from "@/lib/properties/constants";
import { getProperty } from "@/lib/properties/properties";
import { createPropertyContactSchema } from "@/lib/validation/property-contacts";

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

  const contacts = await listPropertyContacts(user.organizationId, id);
  return NextResponse.json({ contacts });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { user, capabilityKeys } = context;
  const canManage = capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_CONTACTS);
  const canCreateOwn = capabilityKeys.includes(PROPERTY_CAPABILITIES.CREATE_CONTACT);
  if (!canManage && !canCreateOwn) {
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
  const parsed = createPropertyContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // A CREATE_CONTACT-only actor (User) may not assign an authoritative
  // ownership role (owner/landlord/property_manager/asset_manager/tenant) —
  // MANAGE_CONTACTS holders (Admin/Manager) are unrestricted.
  if (!canManage && !(USER_CREATABLE_CONTACT_TYPES as readonly string[]).includes(parsed.data.contactType)) {
    return NextResponse.json(
      {
        error: "invalid_input",
        details: { fieldErrors: { contactType: ["That contact type isn't available to you."] } },
      },
      { status: 400 },
    );
  }

  const contact = await createPropertyContact(user.organizationId, id, user.id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property.contact_create",
    entityType: "property",
    entityId: id,
    after: { contactId: contact.id, name: contact.name, contactType: contact.contactType },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
