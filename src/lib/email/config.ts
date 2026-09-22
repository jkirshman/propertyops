export interface EmailEnvConfig {
  EMAIL_ENABLED?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM_ADDRESS?: string;
  APP_BASE_URL?: string;
}

/** Defaults OFF: sending requires an explicit "true", never just presence of other config. */
export function isEmailSendingEnabled(env: EmailEnvConfig = process.env as EmailEnvConfig): boolean {
  return env.EMAIL_ENABLED === "true";
}

export function getEmailConfigStatus(env: EmailEnvConfig = process.env as EmailEnvConfig) {
  return {
    enabled: isEmailSendingEnabled(env),
    hasApiKey: Boolean(env.RESEND_API_KEY),
    hasFromAddress: Boolean(env.EMAIL_FROM_ADDRESS),
    // Informational only — emails still send without it, just without a
    // clickable deep link (see absoluteDeepLink in notifications.ts and
    // buildActivationUrl in users.ts, which both already fall back cleanly).
    hasAppBaseUrl: Boolean(env.APP_BASE_URL),
  };
}

export const DEFAULT_EMAIL_FROM_NAME = "PropertyOps";

/**
 * The display-named From header (AUTH-1). EMAIL_FROM_ADDRESS stays the single
 * source of truth: a value that already carries a display name (e.g.
 * "PropertyOps <properties@lawassetgroup.com>") is used verbatim, and a bare
 * address is wrapped as "PropertyOps <address>" so outbound mail never
 * regresses to an address-only sender.
 */
export function formatFromAddress(env: EmailEnvConfig = process.env as EmailEnvConfig): string | null {
  const raw = env.EMAIL_FROM_ADDRESS?.trim();
  if (!raw) {
    return null;
  }
  if (raw.includes("<")) {
    return raw;
  }
  return `${DEFAULT_EMAIL_FROM_NAME} <${raw}>`;
}

export type EmailSendGate = "send" | "skipped_disabled" | "not_configured";

/** Pure decision behind sendTrackedEmail's first two branches — EMAIL_ENABLED is checked before anything else. */
export function resolveEmailSendGate(status: ReturnType<typeof getEmailConfigStatus>): EmailSendGate {
  if (!status.enabled) {
    return "skipped_disabled";
  }
  if (!status.hasApiKey || !status.hasFromAddress) {
    return "not_configured";
  }
  return "send";
}
