import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import {
  createNotificationSchema,
  type CreateNotificationInput,
} from "@/lib/validation/notifications";

/**
 * Creates a notification, or silently skips if one with the same
 * (recipient, dedupeKey) pair already exists. Returns null on a skipped dupe.
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
