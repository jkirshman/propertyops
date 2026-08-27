import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { markNotificationRead } from "@/lib/notifications/notifications";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  await markNotificationRead(user.id, id);

  return NextResponse.json({ ok: true });
}
