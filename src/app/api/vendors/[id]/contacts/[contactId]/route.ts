import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { getVendorContact, updateVendorContact } from "@/lib/vendors/contacts";
import { updateVendorContactSchema } from "@/lib/validation/vendor-contacts";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.MANAGE_CONTACTS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, contactId } = await params;
  const { user } = context;

  const existing = await getVendorContact(user.organizationId, id, contactId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateVendorContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateVendorContact(user.organizationId, id, contactId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    const changedKeys = Object.keys(diff.after);
    const isActivationOnly = changedKeys.length === 1 && changedKeys[0] === "isActive";
    const action = isActivationOnly
      ? diff.after.isActive
        ? "vendor.contact_activate"
        : "vendor.contact_deactivate"
      : "vendor.contact_update";

    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action,
      entityType: "vendor",
      entityId: id,
      before: { contactId, ...diff.before },
      after: { contactId, ...diff.after },
    });
  }

  return NextResponse.json({ contact: updated });
}
