import { and, desc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";

import { db } from "@/db/client";
import { notifications, users } from "@/db/schema";
import { categoryForNotificationType } from "@/lib/notifications/categories";
import { inboxRuleFor, type InboxAction } from "@/lib/notifications/inbox";
import { getNotificationPreference } from "@/lib/notifications/preferences";
import { sendTrackedEmail } from "@/lib/email/email";
import {
  createNotificationSchema,
  type CreateNotificationInput,
} from "@/lib/validation/notifications";

function absoluteDeepLink(deepLinkUrl: string | null): string | null {
  if (!deepLinkUrl) return null;
  const base = process.env.APP_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}${deepLinkUrl}`;
}

/**
 * One generic transactional email template shared by every notification
 * category — every notification already carries title/body/deepLinkUrl, so a
 * per-notification-type template isn't needed. Failures are tracked (never
 * thrown) by sendTrackedEmail itself; a failed/skipped send never blocks the
 * in-app notification that was already created.
 */
async function maybeSendNotificationEmail(params: {
  organizationId: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string | null;
  deepLinkUrl: string | null;
}): Promise<void> {
  const category = categoryForNotificationType(params.type);
  if (!category) return; // e.g. system.test — never gated, never emailed here

  const preference = await getNotificationPreference(params.recipientUserId, category);
  if (!preference.emailEnabled) return;

  const [recipient] = await db
    .select({ email: users.email, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, params.recipientUserId))
    .limit(1);
  if (!recipient || !recipient.isActive) return;

  const link = absoluteDeepLink(params.deepLinkUrl);
  const html = [
    `<p>${escapeHtml(params.title)}</p>`,
    params.body ? `<p>${escapeHtml(params.body)}</p>` : "",
    link ? `<p><a href="${link}">View in PropertyOps</a></p>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await sendTrackedEmail({
    organizationId: params.organizationId,
    to: recipient.email,
    subject: params.title,
    html,
    kind: `notification.${category}`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Creates a notification, or silently skips if one with the same
 * (recipient, dedupeKey) pair already exists. Returns null on a skipped dupe.
 * The in-app row is always created regardless of preference — preference only
 * gates the additional email send, checked centrally here so no individual
 * notification-events.ts call site needs its own gating logic.
 */
export async function createNotification(input: CreateNotificationInput) {
  const parsed = createNotificationSchema.parse(input);

  const [record] = await db
    .insert(notifications)
    .values({
      organizationId: parsed.organizationId,
      recipientUserId: parsed.recipientUserId,
      actorUserId: parsed.actorUserId ?? null,
      type: parsed.type,
      title: parsed.title,
      body: parsed.body ?? null,
      relatedEntityType: parsed.relatedEntityType ?? null,
      relatedEntityId: parsed.relatedEntityId ?? null,
      deepLinkUrl: parsed.deepLinkUrl ?? null,
      metadata: parsed.metadata ?? null,
      dedupeKey: parsed.dedupeKey ?? null,
    })
    .onConflictDoNothing({
      target: [notifications.recipientUserId, notifications.dedupeKey],
    })
    .returning();

  if (record) {
    await maybeSendNotificationEmail({
      organizationId: record.organizationId,
      recipientUserId: record.recipientUserId,
      type: record.type,
      title: record.title,
      body: record.body,
      deepLinkUrl: record.deepLinkUrl,
    });
  }

  return record ?? null;
}

// LIFECYCLE-1: every read/write below is keyed on the session user's own id
// (recipientUserId) — a caller can never touch someone else's notifications,
// and a dismissed row is hidden but kept.

export async function listNotificationsForUser(recipientUserId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.recipientUserId, recipientUserId), isNull(notifications.dismissedAt)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(recipientUserId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientUserId, recipientUserId),
        isNull(notifications.readAt),
        isNull(notifications.dismissedAt),
      ),
    );

  return rows.length;
}

/**
 * Applies one inbox action (see lib/notifications/inbox.ts) to the
 * recipient's own notifications. Returns how many rows changed; 0 (someone
 * else's id, already in that state, or dismissed) is not an error — the
 * actions are idempotent and never reveal whether another user's id exists.
 */
export async function applyNotificationAction(recipientUserId: string, action: InboxAction): Promise<number> {
  const rule = inboxRuleFor(action);
  const conditions: SQL[] = [eq(notifications.recipientUserId, recipientUserId), isNull(notifications.dismissedAt)];
  if (rule.single && "id" in action) conditions.push(eq(notifications.id, action.id));
  if (rule.onlyRead) conditions.push(isNotNull(notifications.readAt));
  if (rule.onlyUnread) conditions.push(isNull(notifications.readAt));

  const now = new Date();
  const set =
    rule.effect === "set_read"
      ? { readAt: now }
      : rule.effect === "clear_read"
        ? { readAt: null }
        : { dismissedAt: now };

  const rows = await db
    .update(notifications)
    .set(set)
    .where(and(...conditions))
    .returning({ id: notifications.id });
  return rows.length;
}
