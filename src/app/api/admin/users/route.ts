import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { isEmailSendingEnabled } from "@/lib/email/config";
import { sendTrackedEmail } from "@/lib/email/email";
import {
  buildActivationUrl,
  createUser,
  findUserByEmail,
  getRoleForOrganization,
  listUsers,
} from "@/lib/users/users";
import { createUserSchema } from "@/lib/validation/users";

// Distinct from GET /api/users (a capability-free "list org users for a
// picker" endpoint used by work order/PM/inspection forms) — this is the
// Admin Hub's Users & Access listing: capability-gated, filterable, and
// exposes account status (active/pending) that the picker never needs to.
export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const roleId = searchParams.get("roleId") ?? undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

  const users = await listUsers(context.user.organizationId, { search, roleId, isActive });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { user: actor } = context;

  const role = await getRoleForOrganization(actor.organizationId, parsed.data.roleId);
  if (!role) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json({ error: "email_in_use" }, { status: 409 });
  }

  const { user, activationToken, activationExpiresAt } = await createUser(actor.organizationId, parsed.data);
  const activationUrl = buildActivationUrl(activationToken);

  if (isEmailSendingEnabled()) {
    await sendTrackedEmail({
      organizationId: actor.organizationId,
      to: user.email,
      subject: "Set up your PropertyOps account",
      html: `<p>${escapeHtml(actor.displayName)} invited you to PropertyOps Hub.</p><p><a href="${activationUrl}">Set up your account</a></p><p>This link expires in 7 days.</p>`,
      kind: "user_invitation",
    });
  }

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "user.invited",
    entityType: "user",
    entityId: user.id,
    after: { email: user.email, displayName: user.displayName, roleId: user.roleId },
  });

  return NextResponse.json({ user, activationUrl, activationExpiresAt }, { status: 201 });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
