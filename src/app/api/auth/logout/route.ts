import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { revokeSession, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const result = await verifySessionToken(token);
    await revokeSession(token);

    if (result) {
      await recordAuditEvent({
        organizationId: result.user.organizationId,
        actorUserId: result.user.id,
        action: "user.logout",
        entityType: "user",
        entityId: result.user.id,
      });
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
