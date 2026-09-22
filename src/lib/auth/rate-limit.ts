import { and, count, eq, gt, lt } from "drizzle-orm";

import { db } from "@/db/client";
import { authRateLimitEvents } from "@/db/schema";

// AUTH-1: minimal DB-backed fixed-window limiter for unauthenticated auth
// endpoints. In-memory counters don't survive across serverless instances,
// so the ledger lives in Postgres. Count-then-insert isn't atomic — a tight
// concurrent burst can exceed a limit by a request or two, which is
// acceptable for abuse throttling (it is not a security boundary by itself).

const RETENTION_MS = 24 * 60 * 60 * 1000;

export interface RateLimitRule {
  action: string;
  max: number;
  windowMs: number;
}

/** Pure: whether a bucket with `priorCount` events already in the window may accept one more. */
export function isOverRateLimit(priorCount: number, max: number): boolean {
  return priorCount >= max;
}

/**
 * Records one event for `keyHash` under `rule.action` and reports whether the
 * bucket was already at its limit before this event. Every call is recorded,
 * including over-limit ones, so sustained hammering keeps the bucket closed.
 */
export async function consumeRateLimit(rule: RateLimitRule, keyHash: string, now: Date = new Date()): Promise<boolean> {
  const windowStart = new Date(now.getTime() - rule.windowMs);

  const [{ value: priorCount }] = await db
    .select({ value: count() })
    .from(authRateLimitEvents)
    .where(
      and(
        eq(authRateLimitEvents.action, rule.action),
        eq(authRateLimitEvents.keyHash, keyHash),
        gt(authRateLimitEvents.createdAt, windowStart),
      ),
    );

  await db.insert(authRateLimitEvents).values({ action: rule.action, keyHash, createdAt: now });

  // Opportunistic pruning keeps the ledger small without a separate cron.
  await db
    .delete(authRateLimitEvents)
    .where(
      and(
        eq(authRateLimitEvents.action, rule.action),
        lt(authRateLimitEvents.createdAt, new Date(now.getTime() - RETENTION_MS)),
      ),
    );

  return isOverRateLimit(priorCount, rule.max);
}
