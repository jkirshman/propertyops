import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { notificationPreferences } from "@/db/schema";

import { NOTIFICATION_CATEGORIES, isNotificationCategory, type NotificationCategory } from "./categories";

export interface NotificationPreferenceState {
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

// Column defaults (true/true) are the fallback for any category with no row
// yet — a brand-new user, or a category added after the user's row set was
// created, must never look "disabled" just because nothing was ever saved.
const DEFAULT_STATE = { inAppEnabled: true, emailEnabled: true } as const;

/** Always returns exactly one row per fixed category, in NOTIFICATION_CATEGORIES order. */
export async function getNotificationPreferencesForUser(
  userId: string,
): Promise<NotificationPreferenceState[]> {
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  const byCategory = new Map<string, { inAppEnabled: boolean; emailEnabled: boolean }>();
  for (const row of rows) {
    // A legacy/unrecognized category value is dropped here rather than
    // surfaced — the UI only ever renders the fixed category list, so an
    // unknown value would otherwise have nowhere to render and no way to edit.
    if (isNotificationCategory(row.category)) {
      byCategory.set(row.category, { inAppEnabled: row.inAppEnabled, emailEnabled: row.emailEnabled });
    }
  }

  return NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    ...(byCategory.get(category) ?? DEFAULT_STATE),
  }));
}

/**
 * Returns a single category's current preference, defaulting to
 * {inAppEnabled: true, emailEnabled: true} when no row exists yet — used by
 * the send path (createNotification), not the preferences UI.
 */
export async function getNotificationPreference(
  userId: string,
  category: NotificationCategory,
): Promise<{ inAppEnabled: boolean; emailEnabled: boolean }> {
  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.category, category)))
    .limit(1);

  return row ? { inAppEnabled: row.inAppEnabled, emailEnabled: row.emailEnabled } : DEFAULT_STATE;
}

export async function setNotificationPreference(
  organizationId: string,
  userId: string,
  category: NotificationCategory,
  patch: { inAppEnabled?: boolean; emailEnabled?: boolean },
): Promise<NotificationPreferenceState> {
  const [row] = await db
    .insert(notificationPreferences)
    .values({
      organizationId,
      userId,
      category,
      inAppEnabled: patch.inAppEnabled ?? DEFAULT_STATE.inAppEnabled,
      emailEnabled: patch.emailEnabled ?? DEFAULT_STATE.emailEnabled,
    })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.category],
      set: {
        ...(patch.inAppEnabled !== undefined ? { inAppEnabled: patch.inAppEnabled } : {}),
        ...(patch.emailEnabled !== undefined ? { emailEnabled: patch.emailEnabled } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  return { category, inAppEnabled: row.inAppEnabled, emailEnabled: row.emailEnabled };
}
