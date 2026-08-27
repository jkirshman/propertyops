import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const validPassword = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "user.login",
    entityType: "user",
    entityId: user.id,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
