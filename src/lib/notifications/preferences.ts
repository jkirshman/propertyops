import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { notificationPreferences } from "@/db/schema";

import { NOTIFICATION_CATEGORIES, isNotificationCategory, type NotificationCategory } from "./categories";

export interface NotificationPreferenceState {
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  appBriefEnabled: boolean;
}

// Column defaults (true/true/true) are the fallback for any category with no
// row yet — a brand-new user, or a category added after the user's row set
// was created, must never look "disabled" just because nothing was ever
// saved. This is also the intended default for existing users: everyone
// keeps every Home App Brief section they had before this preference existed.
const DEFAULT_STATE = { inAppEnabled: true, emailEnabled: true, appBriefEnabled: true } as const;

/** Always returns exactly one row per fixed category, in NOTIFICATION_CATEGORIES order. */
export async function getNotificationPreferencesForUser(
  userId: string,
): Promise<NotificationPreferenceState[]> {
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  const byCategory = new Map<
    string,
    { inAppEnabled: boolean; emailEnabled: boolean; appBriefEnabled: boolean }
  >();
  for (const row of rows) {
    // A legacy/unrecognized category value is dropped here rather than
    // surfaced — the UI only ever renders the fixed category list, so an
    // unknown value would otherwise have nowhere to render and no way to edit.
    if (isNotificationCategory(row.category)) {
      byCategory.set(row.category, {
        inAppEnabled: row.inAppEnabled,
        emailEnabled: row.emailEnabled,
        appBriefEnabled: row.appBriefEnabled,
      });
    }
  }

  return NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    ...(byCategory.get(category) ?? DEFAULT_STATE),
  }));
}

/**
 * Returns a single category's current preference, defaulting to
 * {inAppEnabled: true, emailEnabled: true, appBriefEnabled: true} when no row
 * exists yet. Used by the send path (createNotification, email-gating only)
 * and by the preferences PATCH route (audit "before" snapshot).
 */
export async function getNotificationPreference(
  userId: string,
  category: NotificationCategory,
): Promise<{ inAppEnabled: boolean; emailEnabled: boolean; appBriefEnabled: boolean }> {
  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.category, category)))
    .limit(1);

  return row
    ? { inAppEnabled: row.inAppEnabled, emailEnabled: row.emailEnabled, appBriefEnabled: row.appBriefEnabled }
    : DEFAULT_STATE;
}

export async function setNotificationPreference(
  organizationId: string,
  userId: string,
  category: NotificationCategory,
  patch: { inAppEnabled?: boolean; emailEnabled?: boolean; appBriefEnabled?: boolean },
): Promise<NotificationPreferenceState> {
  const [row] = await db
    .insert(notificationPreferences)
    .values({
      organizationId,
      userId,
      category,
      inAppEnabled: patch.inAppEnabled ?? DEFAULT_STATE.inAppEnabled,
      emailEnabled: patch.emailEnabled ?? DEFAULT_STATE.emailEnabled,
      appBriefEnabled: patch.appBriefEnabled ?? DEFAULT_STATE.appBriefEnabled,
    })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.category],
      set: {
        ...(patch.inAppEnabled !== undefined ? { inAppEnabled: patch.inAppEnabled } : {}),
        ...(patch.emailEnabled !== undefined ? { emailEnabled: patch.emailEnabled } : {}),
        ...(patch.appBriefEnabled !== undefined ? { appBriefEnabled: patch.appBriefEnabled } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    category,
    inAppEnabled: row.inAppEnabled,
    emailEnabled: row.emailEnabled,
    appBriefEnabled: row.appBriefEnabled,
  };
}
