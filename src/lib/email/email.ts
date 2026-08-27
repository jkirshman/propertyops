import { Resend } from "resend";

import { db } from "@/db/client";
import { emailSendAttempts } from "@/db/schema";
import { getEmailConfigStatus } from "@/lib/email/config";
import { maskEmail } from "@/lib/email/mask-email";

export { getEmailConfigStatus } from "@/lib/email/config";

/** Strips anything long enough to be a key/token before it reaches the audit table. */
function sanitizeFailureReason(message: string): string {
  return message.replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]").slice(0, 300);
}

export async function sendTrackedEmail(params: {
  organizationId: string;
  to: string;
  subject: string;
  html: string;
  kind: string;
}) {
  const status = getEmailConfigStatus();
  const toEmailMasked = maskEmail(params.to);

  if (!status.enabled) {
    const [attempt] = await db
      .insert(emailSendAttempts)
      .values({
        organizationId: params.organizationId,
        toEmailMasked,
        subject: params.subject,
        kind: params.kind,
        status: "skipped_disabled",
      })
      .returning({ id: emailSendAttempts.id });
    return { sent: false as const, reason: "disabled" as const, attemptId: attempt.id };
  }

  if (!status.hasApiKey || !status.hasFromAddress) {
    const [attempt] = await db
      .insert(emailSendAttempts)
      .values({
        organizationId: params.organizationId,
        toEmailMasked,
        subject: params.subject,
        kind: params.kind,
        status: "failed",
        failureReason: "email sending is not fully configured",
      })
      .returning({ id: emailSendAttempts.id });
    return { sent: false as const, reason: "not_configured" as const, attemptId: attempt.id };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM_ADDRESS as string,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      const [attempt] = await db
        .insert(emailSendAttempts)
        .values({
          organizationId: params.organizationId,
          toEmailMasked,
          subject: params.subject,
          kind: params.kind,
          status: "failed",
          failureReason: sanitizeFailureReason(result.error.message),
        })
        .returning({ id: emailSendAttempts.id });
      return { sent: false as const, reason: "provider_error" as const, attemptId: attempt.id };
    }

    const [attempt] = await db
      .insert(emailSendAttempts)
      .values({
        organizationId: params.organizationId,
        toEmailMasked,
        subject: params.subject,
        kind: params.kind,
        status: "sent",
        providerMessageId: result.data?.id ?? null,
      })
      .returning({ id: emailSendAttempts.id });
    return { sent: true as const, attemptId: attempt.id };
  } catch (error) {
    const [attempt] = await db
      .insert(emailSendAttempts)
      .values({
        organizationId: params.organizationId,
        toEmailMasked,
        subject: params.subject,
        kind: params.kind,
        status: "failed",
        failureReason: sanitizeFailureReason(
          error instanceof Error ? error.message : "unknown error",
        ),
      })
      .returning({ id: emailSendAttempts.id });
    return { sent: false as const, reason: "exception" as const, attemptId: attempt.id };
  }
}
