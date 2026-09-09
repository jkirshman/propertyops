import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { isEmailSendingEnabled } from "@/lib/email/config";
import { sendTrackedEmail } from "@/lib/email/email";
import { buildActivationUrl, resendActivation } from "@/lib/users/users";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user: actor } = context;

  const result = await resendActivation(actor.organizationId, id);
  if (!result) {
    return NextResponse.json({ error: "not_found_or_already_active" }, { status: 404 });
  }

  const activationUrl = buildActivationUrl(result.activationToken);

  if (isEmailSendingEnabled()) {
    await sendTrackedEmail({
      organizationId: actor.organizationId,
      to: result.user.email,
      subject: "Set up your PropertyOps account",
      html: `<p>Here is a new link to set up your PropertyOps account.</p><p><a href="${activationUrl}">Set up your account</a></p><p>This link expires in 7 days.</p>`,
      kind: "user_invitation",
    });
  }

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "user.activation_resent",
    entityType: "user",
    entityId: id,
  });

  return NextResponse.json({ activationUrl, activationExpiresAt: result.activationExpiresAt });
}
