import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE_NAME = "propertyops_session";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const SESSION_RENEWAL_THRESHOLD_MS = 1000 * 60 * 60 * 24; // renew inside the last day

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({ userId, tokenHash, expiresAt });

  return { token, expiresAt };
}

export async function verifySessionToken(token: string) {
  const tokenHash = hashSessionToken(token);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!session || session.expiresAt.getTime() < Date.now()) {
    return null;
  }

  const remainingMs = session.expiresAt.getTime() - Date.now();
  if (remainingMs < SESSION_RENEWAL_THRESHOLD_MS) {
    // Rolling expiration: only write when the session is close to expiring,
    // instead of on every request.
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_DURATION_MS) })
      .where(eq(sessions.tokenHash, tokenHash));
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || !user.isActive) {
    return null;
  }

  return { session, user };
}

export async function revokeSession(token: string) {
  const tokenHash = hashSessionToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
