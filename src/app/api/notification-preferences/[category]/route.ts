import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isNotificationCategory } from "@/lib/notifications/categories";
import { getNotificationPreference, setNotificationPreference } from "@/lib/notifications/preferences";
import { updateNotificationPreferenceSchema } from "@/lib/validation/notification-preferences";

// Self-scoped, same as GET /api/notification-preferences — no capability
// required, and there is no path here to another user's preferences.
export async function PATCH(request: Request, { params }: { params: Promise<{ category: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { category } = await params;
  if (!isNotificationCategory(category)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateNotificationPreferenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const before = await getNotificationPreference(user.id, category);
  const updated = await setNotificationPreference(user.organizationId, user.id, category, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "notification_preference.updated",
    entityType: "notification_preference",
    entityId: `${user.id}:${category}`,
    before,
    after: {
      inAppEnabled: updated.inAppEnabled,
      emailEnabled: updated.emailEnabled,
      appBriefEnabled: updated.appBriefEnabled,
    },
  });

  return NextResponse.json({ preference: updated });
}
