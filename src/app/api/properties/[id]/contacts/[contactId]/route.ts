import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { diffFields } from "@/lib/db/diff-fields";
import { canEditPropertyContact, getPropertyContact, updatePropertyContact } from "@/lib/properties/contacts";
import { PROPERTY_CAPABILITIES, USER_CREATABLE_CONTACT_TYPES } from "@/lib/properties/constants";
import { updatePropertyContactSchema } from "@/lib/validation/property-contacts";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { user, capabilityKeys } = context;
  const canManage = capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_CONTACTS);
  if (!canManage && !capabilityKeys.includes(PROPERTY_CAPABILITIES.CREATE_CONTACT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, contactId } = await params;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existing = await getPropertyContact(user.organizationId, id, contactId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!canEditPropertyContact(capabilityKeys, existing, user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePropertyContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Delete/deactivate and any authoritative-role reassignment stay
  // MANAGE_CONTACTS-only, even for a User editing their own contact.
  if (!canManage) {
    if (parsed.data.isActive === false) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (
      parsed.data.contactType !== undefined &&
      !(USER_CREATABLE_CONTACT_TYPES as readonly string[]).includes(parsed.data.contactType)
    ) {
      return NextResponse.json(
        {
          error: "invalid_input",
          details: { fieldErrors: { contactType: ["That contact type isn't available to you."] } },
        },
        { status: 400 },
      );
    }
  }

  const updated = await updatePropertyContact(user.organizationId, id, contactId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    const changedKeys = Object.keys(diff.after);
    const isActivationOnly = changedKeys.length === 1 && changedKeys[0] === "isActive";
    const action = isActivationOnly
      ? diff.after.isActive
        ? "property.contact_activate"
        : "property.contact_deactivate"
      : "property.contact_update";

    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action,
      entityType: "property",
      entityId: id,
      before: { contactId, ...diff.before },
      after: { contactId, ...diff.after },
    });
  }

  return NextResponse.json({ contact: updated });
}
