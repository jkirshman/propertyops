import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { TENANT_CAPABILITIES } from "@/lib/tenants/constants";
import { createTenantContact, listTenantContacts } from "@/lib/tenants/contacts";
import { getTenant, tenantHasAccessibleLease } from "@/lib/tenants/tenants";
import { createTenantContactSchema } from "@/lib/validation/tenant-contacts";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(TENANT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  if (scope.kind !== "all" && !(await tenantHasAccessibleLease(context.user.organizationId, id, scope))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const contacts = await listTenantContacts(context.user.organizationId, id);
  return NextResponse.json({ contacts });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(TENANT_CAPABILITIES.MANAGE_CONTACTS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const tenant = await getTenant(user.organizationId, id);
  if (!tenant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, context.capabilityKeys);
  if (scope.kind !== "all" && !(await tenantHasAccessibleLease(user.organizationId, id, scope))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTenantContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const contact = await createTenantContact(user.organizationId, id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "tenant.contact_create",
    entityType: "tenant",
    entityId: id,
    after: { contactId: contact.id, name: contact.name },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
