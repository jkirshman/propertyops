import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { revokeSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await revokeSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
