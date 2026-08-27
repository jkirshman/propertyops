import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const result = await verifySessionToken(token);
  if (!result) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
    },
  });
}
