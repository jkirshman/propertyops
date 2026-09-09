import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { completeActivation, peekActivationToken } from "@/lib/users/users";
import { activateAccountSchema } from "@/lib/validation/users";

/** Validates a token without consuming it — lets the public /activate page decide whether to show the set-password form or an "invalid/expired" state. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const result = await peekActivationToken(token);
  if (!result) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  return NextResponse.json({ displayName: result.displayName });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = activateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const user = await completeActivation(parsed.data.token, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "user.activated_account",
    entityType: "user",
    entityId: user.id,
  });

  const { token: sessionToken, expiresAt } = await createSession(user.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
