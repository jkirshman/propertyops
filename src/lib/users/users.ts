import { randomBytes } from "node:crypto";

import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db/client";
import { capabilities, roleCapabilities, roles, users } from "@/db/schema";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getRoleCapabilityKeys } from "@/lib/auth/capabilities";
import { hashPassword } from "@/lib/auth/password";
import { generateSessionToken, hashSessionToken } from "@/lib/auth/session";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validation/users";

/** Minimal read-only projection used to populate assignee/requester pickers. */
export async function listOrganizationUsers(organizationId: string) {
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.organizationId, organizationId), eq(users.isActive, true)))
    .orderBy(asc(users.displayName));
}

/** Active users in the org whose role grants the given capability — used to target notifications at whoever can act on them. */
export async function listUsersWithCapability(organizationId: string, capabilityKey: string) {
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .innerJoin(roleCapabilities, eq(roleCapabilities.roleId, users.roleId))
    .innerJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true),
        eq(capabilities.key, capabilityKey),
      ),
    )
    .orderBy(asc(users.displayName));
}

// --- POLISH-5: Users & Access admin (below) ---------------------------------

// 7 days — long enough for a real invite to reach someone without being an
// indefinitely-valid credential sitting in an inbox.
export const ACTIVATION_TOKEN_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

type UserRow = typeof users.$inferSelect;

/** Everything about a user EXCEPT credential/token material — the only shape that should ever leave this module. */
export type SafeUser = {
  id: string;
  organizationId: string;
  roleId: string;
  email: string;
  displayName: string;
  isActive: boolean;
  // True until the admin-created invite is completed via /activate — never
  // derived from anything but the presence of a still-valid activation token.
  isPending: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    organizationId: row.organizationId,
    roleId: row.roleId,
    email: row.email,
    displayName: row.displayName,
    isActive: row.isActive,
    isPending: Boolean(row.activationTokenHash),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listUsers(
  organizationId: string,
  options: { search?: string; roleId?: string; isActive?: boolean } = {},
): Promise<SafeUser[]> {
  const conditions = [eq(users.organizationId, organizationId)];
  if (options.roleId) {
    conditions.push(eq(users.roleId, options.roleId));
  }
  if (options.isActive !== undefined) {
    conditions.push(eq(users.isActive, options.isActive));
  }
  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    const searchCondition = or(ilike(users.displayName, term), ilike(users.email, term));
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const rows = await db
    .select()
    .from(users)
    .where(and(...conditions))
    .orderBy(asc(users.displayName));
  return rows.map(toSafeUser);
}

export async function getUser(organizationId: string, id: string): Promise<SafeUser | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
    .limit(1);
  return row ? toSafeUser(row) : null;
}

/**
 * `users.email` is uniquely indexed platform-wide, not per organization, so
 * this intentionally checks across every org — the same rule the database
 * itself enforces. Used only to return a friendly "already in use" error
 * before insert, never to look up or return another org's user data.
 */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

export async function getRoleForOrganization(organizationId: string, roleId: string) {
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, organizationId)))
    .limit(1);
  return role ?? null;
}

/**
 * Active users whose role currently grants `users.manage` — the real
 * lockout-risk set (see last-admin-guard.ts). One capability lookup per
 * active user; acceptable for an internal-portfolio-scale org roster, not a
 * hot path.
 */
export async function listActiveUserAdminIds(organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ id: users.id, roleId: users.roleId })
    .from(users)
    .where(and(eq(users.organizationId, organizationId), eq(users.isActive, true)));

  const adminIds: string[] = [];
  for (const row of rows) {
    const capabilityKeys = await getRoleCapabilityKeys(row.roleId);
    if (capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
      adminIds.push(row.id);
    }
  }
  return adminIds;
}

async function writeActivationToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_DURATION_MS);
  await db
    .update(users)
    .set({ activationTokenHash: tokenHash, activationTokenExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return { token, expiresAt };
}

/**
 * Admin-create flow (POLISH-5): inserts the user with an unguessable random
 * placeholder credential nobody is ever told, then issues an activation
 * token using the same crypto primitives as session tokens. The raw token is
 * returned exactly once — only its SHA-256 hash is ever persisted.
 */
export async function createUser(
  organizationId: string,
  input: CreateUserInput,
): Promise<{ user: SafeUser; activationToken: string; activationExpiresAt: Date }> {
  const placeholderPassword = randomBytes(32).toString("hex");
  const { salt, hash } = await hashPassword(placeholderPassword);

  const [row] = await db
    .insert(users)
    .values({
      organizationId,
      roleId: input.roleId,
      email: input.email,
      displayName: input.displayName,
      passwordHash: hash,
      passwordSalt: salt,
    })
    .returning();

  const { token, expiresAt } = await writeActivationToken(row.id);

  return {
    user: { ...toSafeUser(row), isPending: true },
    activationToken: token,
    activationExpiresAt: expiresAt,
  };
}

/** Regenerates an activation link for a user who never completed activation. */
export async function resendActivation(
  organizationId: string,
  id: string,
): Promise<{ user: SafeUser; activationToken: string; activationExpiresAt: Date } | null> {
  const existing = await getUser(organizationId, id);
  if (!existing || !existing.isPending) {
    return null;
  }
  const { token, expiresAt } = await writeActivationToken(id);
  return { user: { ...existing, isPending: true }, activationToken: token, activationExpiresAt: expiresAt };
}

export async function updateUser(
  organizationId: string,
  id: string,
  input: UpdateUserInput,
): Promise<SafeUser | null> {
  const [row] = await db
    .update(users)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
    .returning();
  return row ? toSafeUser(row) : null;
}

/** Validates a still-unexpired activation token without consuming it — backs the public /activate page's initial check. */
export async function peekActivationToken(token: string): Promise<{ displayName: string } | null> {
  const tokenHash = hashSessionToken(token);
  const [row] = await db.select().from(users).where(eq(users.activationTokenHash, tokenHash)).limit(1);
  if (!row || !row.activationTokenExpiresAt || row.activationTokenExpiresAt.getTime() < Date.now()) {
    return null;
  }
  return { displayName: row.displayName };
}

/** Consumes a valid activation token, setting the user's real password and clearing the token. Returns the activated user row, or null if the token is invalid/expired. */
export async function completeActivation(token: string, password: string): Promise<UserRow | null> {
  const tokenHash = hashSessionToken(token);
  const [row] = await db.select().from(users).where(eq(users.activationTokenHash, tokenHash)).limit(1);
  if (!row || !row.activationTokenExpiresAt || row.activationTokenExpiresAt.getTime() < Date.now()) {
    return null;
  }

  const { salt, hash } = await hashPassword(password);
  const [updated] = await db
    .update(users)
    .set({
      passwordHash: hash,
      passwordSalt: salt,
      activationTokenHash: null,
      activationTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, row.id))
    .returning();
  return updated ?? null;
}

/** Builds the link shown to the admin (and emailed, if enabled) once at invite time. Relative when APP_BASE_URL isn't set, same fallback as notification deep links. */
export function buildActivationUrl(token: string, appBaseUrl: string | undefined = process.env.APP_BASE_URL): string {
  const path = `/activate?token=${token}`;
  return appBaseUrl ? `${appBaseUrl.replace(/\/$/, "")}${path}` : path;
}
