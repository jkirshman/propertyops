import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { emailSendAttempts } from "@/db/schema";

export interface EmailSendHistoryFilters {
  status?: string;
  kind?: string;
  since?: Date;
  until?: Date;
  limit?: number;
}

const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 200;

/** Pure so the clamping rule (default 50, cap 200, ignore garbage input) is directly testable. */
export function clampHistoryLimit(requested: number | undefined): number {
  if (!requested || !Number.isFinite(requested) || requested < 1) {
    return DEFAULT_HISTORY_LIMIT;
  }
  return Math.min(Math.floor(requested), MAX_HISTORY_LIMIT);
}

export type EmailSendAttemptRow = typeof emailSendAttempts.$inferSelect;

/** `toEmailMasked` is already masked at write time (see sendTrackedEmail) — never re-derived or unmasked here. */
export async function listEmailSendAttempts(
  organizationId: string,
  filters: EmailSendHistoryFilters = {},
): Promise<EmailSendAttemptRow[]> {
  const conditions = [eq(emailSendAttempts.organizationId, organizationId)];
  if (filters.status) {
    conditions.push(eq(emailSendAttempts.status, filters.status));
  }
  if (filters.kind) {
    conditions.push(eq(emailSendAttempts.kind, filters.kind));
  }
  if (filters.since) {
    conditions.push(gte(emailSendAttempts.createdAt, filters.since));
  }
  if (filters.until) {
    conditions.push(lte(emailSendAttempts.createdAt, filters.until));
  }

  return db
    .select()
    .from(emailSendAttempts)
    .where(and(...conditions))
    .orderBy(desc(emailSendAttempts.createdAt))
    .limit(clampHistoryLimit(filters.limit));
}
