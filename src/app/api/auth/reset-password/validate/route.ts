import { NextResponse } from "next/server";

import { peekPasswordResetToken } from "@/lib/auth/password-reset";
import { createResetPasswordDeps } from "@/lib/auth/password-reset-store";
import { resetPasswordTokenSchema } from "@/lib/validation/auth";

/**
 * Checks a reset token without consuming it, so the page can show either the
 * form or the invalid-link state. POST (not GET) keeps the raw token out of
 * request URLs and access logs. Always one generic "invalid" answer — never
 * which check failed.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ valid: false });
  }

  const valid = await peekPasswordResetToken(parsed.data.token, createResetPasswordDeps());
  return NextResponse.json({ valid });
}
