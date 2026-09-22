import { NextResponse } from "next/server";

import { completePasswordReset } from "@/lib/auth/password-reset";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { createResetPasswordDeps } from "@/lib/auth/password-reset-store";
import { resetPasswordSchema } from "@/lib/validation/auth";

/**
 * Completes a reset. Deliberately does not sign the user in: every session
 * (including any the requester may hold) is revoked, and the user signs in
 * explicitly with the new password.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    // Field errors only (password length / confirmation) — the token field's
    // own error is collapsed into the generic invalid-link answer.
    const { fieldErrors } = parsed.error.flatten();
    if (fieldErrors.token) {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid_input", details: { fieldErrors } }, { status: 400 });
  }

  const result = await completePasswordReset(
    { token: parsed.data.token, password: parsed.data.password },
    createResetPasswordDeps(),
  );
  if (!result.ok) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  // Every session row is already gone; also drop this browser's stale cookie.
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
