export interface EmailEnvConfig {
  EMAIL_ENABLED?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM_ADDRESS?: string;
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
  };
}
