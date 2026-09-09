import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getNotificationPreferencesForUser } from "@/lib/notifications/preferences";

// Self-scoped: any authenticated user may read their own preferences, no
// capability required (managing another user's preferences belongs to a
// future admin phase, not here).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const preferences = await getNotificationPreferencesForUser(user.id);
  return NextResponse.json({ preferences });
}
