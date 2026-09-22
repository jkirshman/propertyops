import { and, eq, isNull, ne } from "drizzle-orm";

import { recordAuditEvent } from "@/db/audit";
import { db } from "@/db/client";
import { passwordResetTokens, sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import {
  hashRateLimitKey,
  PASSWORD_RESET_RATE_LIMITS,
  type ForgotPasswordDeps,
  type ResetEligibilityUser,
  type ResetPasswordDeps,
  type ResetTokenRow,
} from "@/lib/auth/password-reset";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { sendTrackedEmail } from "@/lib/email/email";

// DB-backed implementations of the password-reset orchestrators'
// dependencies. Nothing here ever receives or persists a raw token, a reset
// URL, or a password — only hashes.

const eligibilityColumns = {
  id: users.id,
  organizationId: users.organizationId,
  email: users.email,
  isActive: users.isActive,
  activationTokenHash: users.activationTokenHash,
};

const tokenColumns = {
  id: passwordResetTokens.id,
  userId: passwordResetTokens.userId,
  organizationId: passwordResetTokens.organizationId,
  expiresAt: passwordResetTokens.expiresAt,
  usedAt: passwordResetTokens.usedAt,
  invalidatedAt: passwordResetTokens.invalidatedAt,
};

/** Outstanding = neither used nor already invalidated. */
function outstandingTokensFor(userId: string) {
  return and(
    eq(passwordResetTokens.userId, userId),
    isNull(passwordResetTokens.usedAt),
    isNull(passwordResetTokens.invalidatedAt),
  );
}

/**
 * Un-awaited query that invalidates every outstanding reset token for a user,
 * so it can join a db.batch with the deactivation update (see updateUser).
 * Scoped by organization as well as user.
 */
export function invalidateOutstandingResetTokensQuery(userId: string, organizationId: string, now: Date) {
  return db
    .update(passwordResetTokens)
    .set({ invalidatedAt: now })
    .where(and(outstandingTokensFor(userId), eq(passwordResetTokens.organizationId, organizationId)))
    .returning({ id: passwordResetTokens.id });
}

async function findUserByEmail(email: string): Promise<ResetEligibilityUser | null> {
  // users.email is unique platform-wide, so this resolves at most one user —
  // and the token row then carries that user's own organization.
  const [row] = await db.select(eligibilityColumns).from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

async function findUserById(userId: string): Promise<ResetEligibilityUser | null> {
  const [row] = await db.select(eligibilityColumns).from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

async function findTokenByHash(tokenHash: string): Promise<ResetTokenRow | null> {
  const [row] = await db
    .select(tokenColumns)
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);
  return row ?? null;
}

export function createForgotPasswordDeps(): ForgotPasswordDeps {
  return {
    appBaseUrl: process.env.APP_BASE_URL || undefined,
    async consumeRateLimits({ email, ipHash }) {
      const emailLimited = await consumeRateLimit(PASSWORD_RESET_RATE_LIMITS.perEmail, hashRateLimitKey(email));
      const ipLimited = ipHash ? await consumeRateLimit(PASSWORD_RESET_RATE_LIMITS.perIp, ipHash) : false;
      return emailLimited || ipLimited;
    },
    findUserByEmail,
    async issueToken({ user, tokenHash, expiresAt, ipHash }) {
      const now = new Date();
      const [invalidated] = await db.batch([
        db
          .update(passwordResetTokens)
          .set({ invalidatedAt: now })
          .where(outstandingTokensFor(user.id))
          .returning({ id: passwordResetTokens.id }),
        db.insert(passwordResetTokens).values({
          organizationId: user.organizationId,
          userId: user.id,
          tokenHash,
          expiresAt,
          requestedIpHash: ipHash,
        }),
      ]);
      return { invalidatedPriorCount: invalidated.length };
    },
    async sendEmail({ organizationId, to, email }) {
      const result = await sendTrackedEmail({
        organizationId,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        kind: email.kind,
      });
      return { sent: result.sent };
    },
    audit: (event) => recordAuditEvent(event),
  };
}

export function createResetPasswordDeps(): ResetPasswordDeps {
  return {
    findTokenByHash,
    findUserById,
    async claimToken(tokenId, now) {
      const claimed = await db
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(passwordResetTokens.id, tokenId),
            isNull(passwordResetTokens.usedAt),
            isNull(passwordResetTokens.invalidatedAt),
          ),
        )
        .returning({ id: passwordResetTokens.id });
      return claimed.length === 1;
    },
    async invalidateToken(tokenId, now) {
      await db
        .update(passwordResetTokens)
        .set({ invalidatedAt: now })
        .where(and(eq(passwordResetTokens.id, tokenId), isNull(passwordResetTokens.invalidatedAt)));
    },
    hashPassword,
    async applyReset({ userId, tokenId, salt, hash, now }) {
      // One batch = one transaction on neon-http: credential change, token
      // invalidation, and session revocation land together or not at all.
      const [, invalidated, revoked] = await db.batch([
        db
          .update(users)
          .set({ passwordHash: hash, passwordSalt: salt, updatedAt: now })
          .where(and(eq(users.id, userId), eq(users.isActive, true))),
        db
          .update(passwordResetTokens)
          .set({ invalidatedAt: now })
          .where(and(outstandingTokensFor(userId), ne(passwordResetTokens.id, tokenId)))
          .returning({ id: passwordResetTokens.id }),
        db.delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id }),
      ]);
      return { revokedSessionCount: revoked.length, invalidatedTokenCount: invalidated.length };
    },
    audit: (event) => recordAuditEvent(event),
  };
}
