import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";
import {
  FORGOT_PASSWORD_RESPONSE,
  PASSWORD_RESET_TOKEN_DURATION_MS,
  completePasswordReset,
  generatePasswordResetToken,
  hashPasswordResetToken,
  isResetTokenUsable,
  isUserEligibleForPasswordReset,
  peekPasswordResetToken,
  processForgotPasswordRequest,
  resolveClientIp,
  resolveResetRequestOutcome,
  type AuditEventInput,
  type ForgotPasswordDeps,
  type ResetEligibilityUser,
  type ResetPasswordDeps,
  type ResetTokenRow,
} from "./password-reset";

// In-memory stand-in for the DB-backed store (password-reset-store.ts), with
// the same conditional-update semantics, so the real orchestrators run end
// to end without a database.

const ORG_A = "org-a";
const ORG_B = "org-b";
const BASE_URL = "https://propertyops.lawassetgroup.com";

interface FakeUser extends ResetEligibilityUser {
  passwordHash: string;
  passwordSalt: string;
}

interface FakeToken extends ResetTokenRow {
  tokenHash: string;
  requestedIpHash: string | null;
}

async function createWorld(options: { rateLimited?: boolean; appBaseUrl?: string | undefined } = {}) {
  const clock = { now: new Date("2026-09-22T12:00:00Z") };
  const original = await hashPassword("old-password-123");
  const users: FakeUser[] = [
    {
      id: "u-active",
      organizationId: ORG_A,
      email: "active@example.com",
      isActive: true,
      activationTokenHash: null,
      passwordHash: original.hash,
      passwordSalt: original.salt,
    },
    {
      id: "u-inactive",
      organizationId: ORG_A,
      email: "inactive@example.com",
      isActive: false,
      activationTokenHash: null,
      passwordHash: original.hash,
      passwordSalt: original.salt,
    },
    {
      id: "u-pending",
      organizationId: ORG_A,
      email: "pending@example.com",
      isActive: true,
      activationTokenHash: "some-activation-hash",
      passwordHash: original.hash,
      passwordSalt: original.salt,
    },
    {
      id: "u-other-org",
      organizationId: ORG_B,
      email: "other@example.com",
      isActive: true,
      activationTokenHash: null,
      passwordHash: original.hash,
      passwordSalt: original.salt,
    },
  ];
  const tokens: FakeToken[] = [];
  const sessions = [
    { id: "s1", userId: "u-active" },
    { id: "s2", userId: "u-active" },
    { id: "s3", userId: "u-other-org" },
  ];
  const audit: AuditEventInput[] = [];
  const sentEmails: { organizationId: string; to: string; subject: string; kind: string; html: string; text: string }[] =
    [];
  let nextTokenId = 1;
  let lastRawToken: string | null = null;

  const outstanding = (t: FakeToken) => !t.usedAt && !t.invalidatedAt;
  const findUser = (id: string) => users.find((u) => u.id === id) ?? null;

  const forgotDeps: ForgotPasswordDeps = {
    appBaseUrl: "appBaseUrl" in options ? options.appBaseUrl : BASE_URL,
    now: () => clock.now,
    generateToken: () => {
      lastRawToken = generatePasswordResetToken();
      return lastRawToken;
    },
    consumeRateLimits: async () => options.rateLimited ?? false,
    findUserByEmail: async (email) => users.find((u) => u.email === email) ?? null,
    issueToken: async ({ user, tokenHash, expiresAt, ipHash }) => {
      let invalidatedPriorCount = 0;
      for (const t of tokens) {
        if (t.userId === user.id && outstanding(t)) {
          t.invalidatedAt = clock.now;
          invalidatedPriorCount++;
        }
      }
      tokens.push({
        id: `t${nextTokenId++}`,
        userId: user.id,
        organizationId: user.organizationId,
        tokenHash,
        expiresAt,
        usedAt: null,
        invalidatedAt: null,
        requestedIpHash: ipHash,
      });
      return { invalidatedPriorCount };
    },
    sendEmail: async ({ organizationId, to, email }) => {
      sentEmails.push({ organizationId, to, subject: email.subject, kind: email.kind, html: email.html, text: email.text });
      return { sent: true };
    },
    audit: async (event) => {
      audit.push(event);
    },
  };

  let hashPasswordCalls = 0;
  const resetDeps: ResetPasswordDeps = {
    now: () => clock.now,
    findTokenByHash: async (hash) => tokens.find((t) => t.tokenHash === hash) ?? null,
    findUserById: async (id) => findUser(id),
    claimToken: async (id, now) => {
      const t = tokens.find((row) => row.id === id);
      if (!t || !outstanding(t)) return false;
      t.usedAt = now;
      return true;
    },
    invalidateToken: async (id, now) => {
      const t = tokens.find((row) => row.id === id);
      if (t && !t.invalidatedAt) t.invalidatedAt = now;
    },
    hashPassword: async (password) => {
      hashPasswordCalls++;
      return hashPassword(password);
    },
    applyReset: async ({ userId, tokenId, salt, hash, now }) => {
      const user = findUser(userId);
      if (user && user.isActive) {
        user.passwordHash = hash;
        user.passwordSalt = salt;
      }
      let invalidatedTokenCount = 0;
      for (const t of tokens) {
        if (t.userId === userId && t.id !== tokenId && outstanding(t)) {
          t.invalidatedAt = now;
          invalidatedTokenCount++;
        }
      }
      const before = sessions.length;
      for (let i = sessions.length - 1; i >= 0; i--) {
        if (sessions[i].userId === userId) sessions.splice(i, 1);
      }
      return { revokedSessionCount: before - sessions.length, invalidatedTokenCount };
    },
    audit: async (event) => {
      audit.push(event);
    },
  };

  return {
    clock,
    users,
    tokens,
    sessions,
    audit,
    sentEmails,
    forgotDeps,
    resetDeps,
    rawToken: () => lastRawToken,
    /** Mirrors updateUser({ isActive: false }): the flag and token invalidation land together. */
    deactivateUser: (id: string) => {
      const user = findUser(id)!;
      user.isActive = false;
      for (const t of tokens) {
        if (t.userId === id && t.organizationId === user.organizationId && outstanding(t)) {
          t.invalidatedAt = clock.now;
        }
      }
    },
    reactivateUser: (id: string) => {
      findUser(id)!.isActive = true;
    },
    hashPasswordCalls: () => hashPasswordCalls,
    request: (email: string, clientIp: string | null = "203.0.113.7") =>
      processForgotPasswordRequest({ email, clientIp }, forgotDeps),
  };
}

// --- Pure decisions -------------------------------------------------------------

describe("token primitives", () => {
  it("generates 256-bit hex tokens that are unique", () => {
    const token = generatePasswordResetToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(Array.from({ length: 20 }, generatePasswordResetToken)).size).toBe(20);
  });

  it("hashes with SHA-256 and never returns the raw token", () => {
    const token = generatePasswordResetToken();
    const hash = hashPasswordResetToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashPasswordResetToken(token)).toBe(hash);
  });
});

describe("isResetTokenUsable", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const base: ResetTokenRow = {
    id: "t",
    userId: "u",
    organizationId: ORG_A,
    expiresAt: new Date(now.getTime() + 60_000),
    usedAt: null,
    invalidatedAt: null,
  };

  it("accepts an unused, uninvalidated, unexpired token", () => {
    expect(isResetTokenUsable(base, now)).toBe(true);
  });
  it("rejects missing, used, invalidated, and expired tokens", () => {
    expect(isResetTokenUsable(null, now)).toBe(false);
    expect(isResetTokenUsable({ ...base, usedAt: now }, now)).toBe(false);
    expect(isResetTokenUsable({ ...base, invalidatedAt: now }, now)).toBe(false);
    expect(isResetTokenUsable({ ...base, expiresAt: now }, now)).toBe(false);
    expect(isResetTokenUsable({ ...base, expiresAt: new Date(now.getTime() - 1) }, now)).toBe(false);
  });
});

describe("isUserEligibleForPasswordReset / resolveResetRequestOutcome", () => {
  const user: ResetEligibilityUser = {
    id: "u",
    organizationId: ORG_A,
    email: "a@example.com",
    isActive: true,
    activationTokenHash: null,
  };

  it("only allows active, fully activated users", () => {
    expect(isUserEligibleForPasswordReset(user)).toBe(true);
    expect(isUserEligibleForPasswordReset(null)).toBe(false);
    expect(isUserEligibleForPasswordReset({ ...user, isActive: false })).toBe(false);
    expect(isUserEligibleForPasswordReset({ ...user, activationTokenHash: "x" })).toBe(false);
  });

  it("checks the rate limit before anything account-specific", () => {
    expect(resolveResetRequestOutcome({ rateLimited: true, user: null })).toBe("rate_limited");
    expect(resolveResetRequestOutcome({ rateLimited: true, user })).toBe("rate_limited");
    expect(resolveResetRequestOutcome({ rateLimited: false, user: null })).toBe("no_account");
    expect(resolveResetRequestOutcome({ rateLimited: false, user: { ...user, isActive: false } })).toBe("inactive");
    expect(resolveResetRequestOutcome({ rateLimited: false, user: { ...user, activationTokenHash: "x" } })).toBe(
      "pending_activation",
    );
    expect(resolveResetRequestOutcome({ rateLimited: false, user })).toBe("send");
  });
});

describe("resolveClientIp", () => {
  const headers = (entries: Record<string, string>) => new Headers(entries);
  it("uses the first x-forwarded-for hop, then x-real-ip, else null", () => {
    expect(resolveClientIp(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(resolveClientIp(headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(resolveClientIp(headers({}))).toBeNull();
  });
});

describe("FORGOT_PASSWORD_RESPONSE", () => {
  it("is generic and reveals no account state", () => {
    expect(FORGOT_PASSWORD_RESPONSE).toEqual({
      ok: true,
      message: "If an account exists for that email address, we've sent instructions to reset the password.",
    });
  });
});

// --- Reset request --------------------------------------------------------------

describe("processForgotPasswordRequest", () => {
  it("existing active user: stores only a token hash and sends one tracked reset email", async () => {
    const world = await createWorld();
    expect(await world.request("active@example.com")).toBe("email_sent");

    expect(world.tokens).toHaveLength(1);
    const raw = world.rawToken()!;
    expect(world.tokens[0].tokenHash).toBe(hashPasswordResetToken(raw));
    expect(JSON.stringify(world.tokens)).not.toContain(raw);
    expect(world.tokens[0].requestedIpHash).not.toContain("203.0.113.7");
    expect(world.tokens[0].expiresAt.getTime() - world.clock.now.getTime()).toBe(PASSWORD_RESET_TOKEN_DURATION_MS);

    expect(world.sentEmails).toHaveLength(1);
    const [email] = world.sentEmails;
    expect(email.to).toBe("active@example.com");
    expect(email.organizationId).toBe(ORG_A);
    expect(email.kind).toBe("password_reset");
    expect(email.subject).toBe("Reset your PropertyOps password");
    expect(email.text).toContain(`${BASE_URL}/reset-password?token=${raw}`);
    expect(email.html).toContain(`href="${BASE_URL}/reset-password?token=${raw}"`);
  });

  it("nonexistent email: no token, no email, no audit", async () => {
    const world = await createWorld();
    expect(await world.request("nobody@example.com")).toBe("no_account");
    expect(world.tokens).toHaveLength(0);
    expect(world.sentEmails).toHaveLength(0);
    expect(world.audit).toHaveLength(0);
  });

  it("inactive user: no usable token or email (reset cannot reactivate)", async () => {
    const world = await createWorld();
    expect(await world.request("inactive@example.com")).toBe("inactive");
    expect(world.tokens).toHaveLength(0);
    expect(world.sentEmails).toHaveLength(0);
    expect(world.audit[0]).toMatchObject({ action: "auth.password_reset_requested", after: { outcome: "inactive" } });
  });

  it("pending-invite user: no reset — activation remains the onboarding path", async () => {
    const world = await createWorld();
    expect(await world.request("pending@example.com")).toBe("pending_activation");
    expect(world.tokens).toHaveLength(0);
    expect(world.sentEmails).toHaveLength(0);
  });

  it("rate-limited: nothing issued or sent, even for a real account", async () => {
    const world = await createWorld({ rateLimited: true });
    expect(await world.request("active@example.com")).toBe("rate_limited");
    expect(await world.request("nobody@example.com")).toBe("rate_limited");
    expect(world.tokens).toHaveLength(0);
    expect(world.sentEmails).toHaveLength(0);
    expect(world.audit.map((e) => e.action)).toEqual(["auth.password_reset_rate_limited"]);
  });

  it("missing APP_BASE_URL: issues no token (the link would be unusable)", async () => {
    const world = await createWorld({ appBaseUrl: undefined });
    expect(await world.request("active@example.com")).toBe("not_configured");
    expect(world.tokens).toHaveLength(0);
    expect(world.sentEmails).toHaveLength(0);
  });

  it("a new request invalidates the previous unused token", async () => {
    const world = await createWorld();
    await world.request("active@example.com");
    const firstRaw = world.rawToken()!;
    await world.request("active@example.com");

    expect(world.tokens).toHaveLength(2);
    expect(world.tokens[0].invalidatedAt).not.toBeNull();
    expect(world.tokens[1].invalidatedAt).toBeNull();
    expect(world.audit.at(-1)).toMatchObject({ after: { invalidatedPriorCount: 1 } });
    expect(await completePasswordReset({ token: firstRaw, password: "new-password-456" }, world.resetDeps)).toEqual({
      ok: false,
    });
  });

  it("an email-disabled send (sent=false) still records the request without surfacing an error", async () => {
    const world = await createWorld();
    world.forgotDeps.sendEmail = async () => ({ sent: false });
    expect(await world.request("active@example.com")).toBe("email_not_sent");
    expect(world.audit.at(-1)).toMatchObject({ after: { outcome: "email_not_sent" } });
  });

  it("audit metadata never contains the raw token, reset URL, or email body", async () => {
    const world = await createWorld();
    await world.request("active@example.com");
    const serialized = JSON.stringify(world.audit);
    expect(serialized).not.toContain(world.rawToken()!);
    expect(serialized).not.toContain("reset-password");
    expect(serialized).not.toContain(world.tokens[0].tokenHash);
  });
});

// --- Reset completion -----------------------------------------------------------

describe("completePasswordReset", () => {
  async function worldWithToken() {
    const world = await createWorld();
    await world.request("active@example.com");
    return { world, raw: world.rawToken()! };
  }

  it("valid token: sets the new password via the shared hashing utility; old fails, new works", async () => {
    const { world, raw } = await worldWithToken();
    expect(await peekPasswordResetToken(raw, world.resetDeps)).toBe(true);

    expect(await completePasswordReset({ token: raw, password: "new-password-456" }, world.resetDeps)).toEqual({
      ok: true,
    });
    expect(world.hashPasswordCalls()).toBe(1);

    const user = world.users.find((u) => u.id === "u-active")!;
    expect(await verifyPassword("old-password-123", user.passwordSalt, user.passwordHash)).toBe(false);
    expect(await verifyPassword("new-password-456", user.passwordSalt, user.passwordHash)).toBe(true);
  });

  it("revokes every session for that user only", async () => {
    const { world, raw } = await worldWithToken();
    await completePasswordReset({ token: raw, password: "new-password-456" }, world.resetDeps);
    expect(world.sessions.map((s) => s.id)).toEqual(["s3"]);
    expect(world.audit.at(-1)).toMatchObject({
      action: "auth.password_reset_completed",
      entityId: "u-active",
      organizationId: ORG_A,
      after: { revokedSessionCount: 2 },
    });
  });

  it("marks the token used; replay is rejected and the password is unchanged by the replay", async () => {
    const { world, raw } = await worldWithToken();
    await completePasswordReset({ token: raw, password: "new-password-456" }, world.resetDeps);
    expect(world.tokens[0].usedAt).not.toBeNull();

    expect(await peekPasswordResetToken(raw, world.resetDeps)).toBe(false);
    expect(await completePasswordReset({ token: raw, password: "attacker-pass-789" }, world.resetDeps)).toEqual({
      ok: false,
    });
    const user = world.users.find((u) => u.id === "u-active")!;
    expect(await verifyPassword("new-password-456", user.passwordSalt, user.passwordHash)).toBe(true);
  });

  it("concurrent submissions: only one claim wins", async () => {
    const { world, raw } = await worldWithToken();
    const results = await Promise.all([
      completePasswordReset({ token: raw, password: "first-password-1" }, world.resetDeps),
      completePasswordReset({ token: raw, password: "second-password-2" }, world.resetDeps),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("expired token is rejected", async () => {
    const { world, raw } = await worldWithToken();
    world.clock.now = new Date(world.clock.now.getTime() + PASSWORD_RESET_TOKEN_DURATION_MS + 1);
    expect(await peekPasswordResetToken(raw, world.resetDeps)).toBe(false);
    expect(await completePasswordReset({ token: raw, password: "new-password-456" }, world.resetDeps)).toEqual({
      ok: false,
    });
    expect(world.hashPasswordCalls()).toBe(0);
  });

  it("unknown / garbage token is rejected", async () => {
    const { world } = await worldWithToken();
    expect(
      await completePasswordReset({ token: generatePasswordResetToken(), password: "new-password-456" }, world.resetDeps),
    ).toEqual({ ok: false });
  });

  it("user deactivated after requesting: rejected, token burned, sessions untouched", async () => {
    const { world, raw } = await worldWithToken();
    world.users.find((u) => u.id === "u-active")!.isActive = false;
    expect(await completePasswordReset({ token: raw, password: "new-password-456" }, world.resetDeps)).toEqual({
      ok: false,
    });
    expect(world.tokens[0].invalidatedAt).not.toBeNull();
    expect(world.sessions).toHaveLength(3);

    // Reactivating later does not revive the old link.
    world.users.find((u) => u.id === "u-active")!.isActive = true;
    expect(await peekPasswordResetToken(raw, world.resetDeps)).toBe(false);
  });

  it("cross-org: a token only ever resets its own user", async () => {
    const world = await createWorld();
    await world.request("other@example.com");
    const raw = world.rawToken()!;
    expect(world.tokens[0]).toMatchObject({ userId: "u-other-org", organizationId: ORG_B });

    await completePasswordReset({ token: raw, password: "new-password-456" }, world.resetDeps);
    const orgAUser = world.users.find((u) => u.id === "u-active")!;
    expect(await verifyPassword("old-password-123", orgAUser.passwordSalt, orgAUser.passwordHash)).toBe(true);
    expect(world.sessions.map((s) => s.userId)).toEqual(["u-active", "u-active"]);
    expect(world.audit.at(-1)).toMatchObject({ organizationId: ORG_B, entityId: "u-other-org" });
  });

  it("completion audit never contains the token or password", async () => {
    const { world, raw } = await worldWithToken();
    await completePasswordReset({ token: raw, password: "new-password-456" }, world.resetDeps);
    const serialized = JSON.stringify(world.audit);
    expect(serialized).not.toContain(raw);
    expect(serialized).not.toContain("new-password-456");
  });
});

// --- AUTH-1A: deactivation invalidates outstanding tokens ---------------------

describe("admin deactivation", () => {
  it("immediately invalidates the user's outstanding reset tokens", async () => {
    const world = await createWorld();
    await world.request("active@example.com");
    await world.request("other@example.com");

    world.deactivateUser("u-active");

    expect(world.tokens.find((t) => t.userId === "u-active")!.invalidatedAt).not.toBeNull();
    // Other users' tokens (here in another org) are untouched.
    expect(world.tokens.find((t) => t.userId === "u-other-org")!.invalidatedAt).toBeNull();
  });

  it("reactivation does not revive a token issued before deactivation", async () => {
    const world = await createWorld();
    await world.request("active@example.com");
    const raw = world.rawToken()!;

    world.deactivateUser("u-active");
    world.reactivateUser("u-active");

    expect(await peekPasswordResetToken(raw, world.resetDeps)).toBe(false);
    expect(await completePasswordReset({ token: raw, password: "new-password-456" }, world.resetDeps)).toEqual({
      ok: false,
    });
    const user = world.users.find((u) => u.id === "u-active")!;
    expect(await verifyPassword("old-password-123", user.passwordSalt, user.passwordHash)).toBe(true);

    // A fresh request after reactivation works normally.
    await world.request("active@example.com");
    expect(await completePasswordReset({ token: world.rawToken()!, password: "new-password-456" }, world.resetDeps)).toEqual(
      { ok: true },
    );
  });
});
