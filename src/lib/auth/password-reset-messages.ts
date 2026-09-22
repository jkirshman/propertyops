// Client-safe user-facing copy for the password-reset flow (no node:crypto
// imports, so client components can use it). Kept in one place so the server
// response and the page render the exact same text.

/** The only response the request endpoint ever returns for well-formed input — independent of account state. */
export const FORGOT_PASSWORD_RESPONSE = {
  ok: true,
  message: "If an account exists for that email address, we've sent instructions to reset the password.",
} as const;

export const RESET_LINK_INVALID_MESSAGE = "This password reset link is invalid or has expired. Request a new one.";
