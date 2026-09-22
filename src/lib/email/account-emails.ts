import { renderTransactionalEmail, type RenderedEmail } from "@/lib/email/transactional-layout";

// email_send_attempts.kind values for account emails. "user_invitation" is the
// pre-existing kind (POLISH-5) and is kept as-is so existing Email Admin
// history rows and filters stay continuous.
export const ACCOUNT_EMAIL_KINDS = {
  INVITATION: "user_invitation",
  PASSWORD_RESET: "password_reset",
} as const;

export const INVITATION_EMAIL_SUBJECT = "Set up your PropertyOps account";
export const PASSWORD_RESET_EMAIL_SUBJECT = "Reset your PropertyOps password";

export interface AccountEmail extends RenderedEmail {
  subject: string;
  kind: string;
}

/**
 * The inviting administrator is intentionally not named — the recipient
 * can't verify that claim from the email, and naming a person adds little
 * over "a PropertyOps administrator".
 */
export function buildInvitationEmail(params: { activationUrl: string; resend?: boolean }): AccountEmail {
  const rendered = renderTransactionalEmail({
    preheader: "Finish setting up your PropertyOps account.",
    heading: "You've been invited to PropertyOps.",
    paragraphs: params.resend
      ? [
          "Here is a new link to set up your PropertyOps account. Any earlier setup link no longer works.",
          "Choose a password to finish setting up your account.",
        ]
      : [
          "An administrator created a PropertyOps account for this email address.",
          "Choose a password to finish setting up your account.",
        ],
    action: { label: "Set up account", url: params.activationUrl },
    expiryNotice: "This link expires in 7 days.",
    footer:
      "You're receiving this email because a PropertyOps administrator created an account for this email address. If you weren't expecting this, you can ignore this message.",
  });
  return { ...rendered, subject: INVITATION_EMAIL_SUBJECT, kind: ACCOUNT_EMAIL_KINDS.INVITATION };
}

export function buildPasswordResetEmail(params: { resetUrl: string; expiresInMinutes: number }): AccountEmail {
  const rendered = renderTransactionalEmail({
    preheader: "Use this link to choose a new PropertyOps password.",
    heading: "Reset your password",
    paragraphs: ["We received a request to reset the password for your PropertyOps account."],
    action: { label: "Reset password", url: params.resetUrl },
    expiryNotice: `This link expires in ${params.expiresInMinutes} minutes and can be used once.`,
    footer:
      "If you didn't request a password reset, you can ignore this email. Your password will not change.",
  });
  return { ...rendered, subject: PASSWORD_RESET_EMAIL_SUBJECT, kind: ACCOUNT_EMAIL_KINDS.PASSWORD_RESET };
}
