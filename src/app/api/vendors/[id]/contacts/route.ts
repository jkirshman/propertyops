import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { createVendorContact, listVendorContacts } from "@/lib/vendors/contacts";
import { getVendor } from "@/lib/vendors/vendors";
import { createVendorContactSchema } from "@/lib/validation/vendor-contacts";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const contacts = await listVendorContacts(context.user.organizationId, id);
  return NextResponse.json({ contacts });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.MANAGE_CONTACTS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const vendor = await getVendor(user.organizationId, id);
  if (!vendor) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createVendorContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const contact = await createVendorContact(user.organizationId, id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "vendor.contact_create",
    entityType: "vendor",
    entityId: id,
    after: { contactId: contact.id, name: contact.name },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
