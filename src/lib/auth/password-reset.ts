import { createHash, randomBytes } from "node:crypto";

import { buildPasswordResetEmail, type AccountEmail } from "@/lib/email/account-emails";

// AUTH-1 password reset. This module holds the decision logic and the two
// orchestrators (request / complete) with their I/O injected, so every
// security-relevant branch is unit-testable without a database. The DB-backed
// implementations of those dependencies live in password-reset-store.ts.

// 60 minutes: long enough to reach an inbox, short enough that a forgotten
// email isn't a long-lived credential. Deliberately far shorter than the
// 7-day activation link.
export const PASSWORD_RESET_EXPIRES_IN_MINUTES = 60;
export const PASSWORD_RESET_TOKEN_DURATION_MS = PASSWORD_RESET_EXPIRES_IN_MINUTES * 60 * 1000;

export const PASSWORD_RESET_RATE_LIMITS = {
  perEmail: { action: "password_reset.email", max: 3, windowMs: 15 * 60 * 1000 },
  perIp: { action: "password_reset.ip", max: 10, windowMs: 15 * 60 * 1000 },
} as const;

export { FORGOT_PASSWORD_RESPONSE } from "@/lib/auth/password-reset-messages";

export const PASSWORD_RESET_AUDIT_ACTIONS = {
  REQUESTED: "auth.password_reset_requested",
  RATE_LIMITED: "auth.password_reset_rate_limited",
  COMPLETED: "auth.password_reset_completed",
} as const;

// --- Token primitives ---------------------------------------------------------

/** 32 bytes (256 bits) from the CSPRNG, hex-encoded — same strength as session tokens, but a distinct token. */
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 of the raw token. Only this ever reaches the database. */
export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Hashes a client IP for the token row / rate-limit bucket — never stored raw. */
export function hashRateLimitKey(value: string): string {
  return createHash("sha256").update(`propertyops:auth-rate-limit:${value}`).digest("hex");
}

export function buildPasswordResetUrl(token: string, appBaseUrl: string): string {
  return `${appBaseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
}

/** First hop of x-forwarded-for (set by the Vercel edge), then x-real-ip; null when neither is present. */
export function resolveClientIp(headers: Pick<Headers, "get">): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) {
    return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  return realIp || null;
}

// --- Pure decisions -----------------------------------------------------------

export interface ResetEligibilityUser {
  id: string;
  organizationId: string;
  email: string;
  isActive: boolean;
  activationTokenHash: string | null;
}

export interface ResetTokenRow {
  id: string;
  userId: string;
  organizationId: string;
  expiresAt: Date;
  usedAt: Date | null;
  invalidatedAt: Date | null;
}

/**
 * Reset never reactivates a deactivated account, and never substitutes for
 * onboarding: a still-pending invite (activation token present) must go
 * through /activate instead.
 */
export function isUserEligibleForPasswordReset(user: ResetEligibilityUser | null): user is ResetEligibilityUser {
  return Boolean(user && user.isActive && !user.activationTokenHash);
}

export function isResetTokenUsable(row: ResetTokenRow | null, now: Date): row is ResetTokenRow {
  return Boolean(row && !row.usedAt && !row.invalidatedAt && row.expiresAt.getTime() > now.getTime());
}

export type ResetRequestOutcome =
  | "email_sent"
  | "email_not_sent"
  | "no_account"
  | "inactive"
  | "pending_activation"
  | "rate_limited"
  | "not_configured";

export function resolveResetRequestOutcome(params: {
  rateLimited: boolean;
  user: ResetEligibilityUser | null;
}): "send" | Extract<ResetRequestOutcome, "no_account" | "inactive" | "pending_activation" | "rate_limited"> {
  if (params.rateLimited) return "rate_limited";
  if (!params.user) return "no_account";
  if (!params.user.isActive) return "inactive";
  if (params.user.activationTokenHash) return "pending_activation";
  return "send";
}

// --- Request orchestrator -----------------------------------------------------

export interface AuditEventInput {
  organizationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  after?: Record<string, unknown>;
}

export interface ForgotPasswordDeps {
  appBaseUrl: string | undefined;
  /** Records this request against each bucket and reports whether any bucket is over its limit. */
  consumeRateLimits(keys: { email: string; ipHash: string | null }): Promise<boolean>;
  findUserByEmail(email: string): Promise<ResetEligibilityUser | null>;
  /** Invalidates the user's outstanding tokens and stores the new token's hash. */
  issueToken(params: {
    user: ResetEligibilityUser;
    tokenHash: string;
    expiresAt: Date;
    ipHash: string | null;
  }): Promise<{ invalidatedPriorCount: number }>;
  sendEmail(params: { organizationId: string; to: string; email: AccountEmail }): Promise<{ sent: boolean }>;
  audit(event: AuditEventInput): Promise<void>;
  now?: () => Date;
  generateToken?: () => string;
}

/**
 * Everything that happens after a well-formed reset request. The route
 * returns FORGOT_PASSWORD_RESPONSE regardless of the outcome returned here —
 * the outcome exists only for server-side audit and tests.
 */
export async function processForgotPasswordRequest(
  input: { email: string; clientIp: string | null },
  deps: ForgotPasswordDeps,
): Promise<ResetRequestOutcome> {
  const now = deps.now?.() ?? new Date();
  const ipHash = input.clientIp ? hashRateLimitKey(input.clientIp) : null;

  const rateLimited = await deps.consumeRateLimits({ email: input.email, ipHash });
  const user = await deps.findUserByEmail(input.email);
  const decision = resolveResetRequestOutcome({ rateLimited, user });

  if (!user) {
    // No organization to attribute an audit row to — intentionally silent.
    return decision === "rate_limited" ? "rate_limited" : "no_account";
  }

  if (decision === "rate_limited") {
    await deps.audit({
      organizationId: user.organizationId,
      actorUserId: null,
      action: PASSWORD_RESET_AUDIT_ACTIONS.RATE_LIMITED,
      entityType: "user",
      entityId: user.id,
    });
    return "rate_limited";
  }

  if (decision === "inactive" || decision === "pending_activation") {
    await deps.audit({
      organizationId: user.organizationId,
      actorUserId: null,
      action: PASSWORD_RESET_AUDIT_ACTIONS.REQUESTED,
      entityType: "user",
      entityId: user.id,
      after: { outcome: decision },
    });
    return decision;
  }

  if (!deps.appBaseUrl) {
    // Without an absolute base URL the emailed link would be unusable, so no
    // token is issued at all.
    await deps.audit({
      organizationId: user.organizationId,
      actorUserId: null,
      action: PASSWORD_RESET_AUDIT_ACTIONS.REQUESTED,
      entityType: "user",
      entityId: user.id,
      after: { outcome: "not_configured" },
    });
    return "not_configured";
  }

  const token = (deps.generateToken ?? generatePasswordResetToken)();
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_DURATION_MS);
  const { invalidatedPriorCount } = await deps.issueToken({
    user,
    tokenHash: hashPasswordResetToken(token),
    expiresAt,
    ipHash,
  });

  const email = buildPasswordResetEmail({
    resetUrl: buildPasswordResetUrl(token, deps.appBaseUrl),
    expiresInMinutes: PASSWORD_RESET_EXPIRES_IN_MINUTES,
  });
  const { sent } = await deps.sendEmail({ organizationId: user.organizationId, to: user.email, email });
  const outcome: ResetRequestOutcome = sent ? "email_sent" : "email_not_sent";

  await deps.audit({
    organizationId: user.organizationId,
    actorUserId: null,
    action: PASSWORD_RESET_AUDIT_ACTIONS.REQUESTED,
    entityType: "user",
    entityId: user.id,
    after: { outcome, invalidatedPriorCount, expiresAt: expiresAt.toISOString() },
  });
  return outcome;
}

// --- Completion orchestrator --------------------------------------------------

export interface ResetPasswordDeps {
  findTokenByHash(tokenHash: string): Promise<ResetTokenRow | null>;
  findUserById(userId: string): Promise<ResetEligibilityUser | null>;
  /** Conditional single-use claim: true only if this call flipped the token from unused to used. */
  claimToken(tokenId: string, now: Date): Promise<boolean>;
  invalidateToken(tokenId: string, now: Date): Promise<void>;
  hashPassword(password: string): Promise<{ salt: string; hash: string }>;
  /** Sets the new credential, invalidates every other outstanding reset token, and deletes all sessions. */
  applyReset(params: {
    userId: string;
    tokenId: string;
    salt: string;
    hash: string;
    now: Date;
  }): Promise<{ revokedSessionCount: number; invalidatedTokenCount: number }>;
  audit(event: AuditEventInput): Promise<void>;
  now?: () => Date;
}

/** Validates without consuming — backs the reset page's initial "is this link still good" check. */
export async function peekPasswordResetToken(
  token: string,
  deps: Pick<ResetPasswordDeps, "findTokenByHash" | "findUserById" | "now">,
): Promise<boolean> {
  const now = deps.now?.() ?? new Date();
  const row = await deps.findTokenByHash(hashPasswordResetToken(token));
  if (!isResetTokenUsable(row, now)) {
    return false;
  }
  return isUserEligibleForPasswordReset(await deps.findUserById(row.userId));
}

export async function completePasswordReset(
  input: { token: string; password: string },
  deps: ResetPasswordDeps,
): Promise<{ ok: true } | { ok: false }> {
  const now = deps.now?.() ?? new Date();
  const row = await deps.findTokenByHash(hashPasswordResetToken(input.token));
  if (!isResetTokenUsable(row, now)) {
    return { ok: false };
  }

  const user = await deps.findUserById(row.userId);
  if (!isUserEligibleForPasswordReset(user)) {
    // Burn the token so it can't be used later if the account is reactivated.
    await deps.invalidateToken(row.id, now);
    return { ok: false };
  }

  // Hash before claiming so a slow scrypt never holds a claimed-but-unapplied token.
  const { salt, hash } = await deps.hashPassword(input.password);

  // Authoritative single-use gate: two concurrent submissions of the same
  // token can both pass the read above, but only one wins this claim.
  const claimed = await deps.claimToken(row.id, now);
  if (!claimed) {
    return { ok: false };
  }

  const { revokedSessionCount, invalidatedTokenCount } = await deps.applyReset({
    userId: user.id,
    tokenId: row.id,
    salt,
    hash,
    now,
  });

  await deps.audit({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: PASSWORD_RESET_AUDIT_ACTIONS.COMPLETED,
    entityType: "user",
    entityId: user.id,
    after: { revokedSessionCount, invalidatedTokenCount },
  });
  return { ok: true };
}
