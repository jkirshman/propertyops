import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { notifications, users } from "@/db/schema";
import { categoryForNotificationType } from "@/lib/notifications/categories";
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

export async function listNotificationsForUser(recipientUserId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUserId, recipientUserId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(recipientUserId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.recipientUserId, recipientUserId), isNull(notifications.readAt)));

  return rows.length;
}

export async function markNotificationRead(recipientUserId: string, notificationId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.recipientUserId, recipientUserId)),
    );
}
