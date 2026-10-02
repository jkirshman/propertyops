import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import type { InboxAction } from "@/lib/notifications/inbox";
import { applyNotificationAction } from "@/lib/notifications/notifications";

const notificationIdSchema = z.string().uuid();

/**
 * LIFECYCLE-1: shared by the notification action routes. The recipient is
 * always the session user — no user id is ever read from the request.
 */
export async function handleInboxAction(action: InboxAction) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if ("id" in action && !notificationIdSchema.safeParse(action.id).success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const changed = await applyNotificationAction(user.id, action);
  return NextResponse.json({ ok: true, changed });
}
