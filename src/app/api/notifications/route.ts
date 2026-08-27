import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getUnreadNotificationCount, listNotificationsForUser } from "@/lib/notifications/notifications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(user.id),
    getUnreadNotificationCount(user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
