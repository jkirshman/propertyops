import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { sendTrackedEmail } from "@/lib/email/email";

export async function POST() {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.EMAIL)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { user } = context;

  const result = await sendTrackedEmail({
    organizationId: user.organizationId,
    to: user.email,
    subject: "PropertyOps Hub test email",
    html: "<p>This is a test email from the PropertyOps Hub email foundation.</p>",
    kind: "test",
  });

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "email.test_send",
    entityType: "email_send_attempt",
    entityId: result.attemptId,
  });

  return NextResponse.json(result);
}
