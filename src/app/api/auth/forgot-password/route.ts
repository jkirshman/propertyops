import { after } from "next/server";

import { handleForgotPasswordRequest } from "@/lib/auth/forgot-password-handler";
import { processForgotPasswordRequest } from "@/lib/auth/password-reset";
import { createForgotPasswordDeps } from "@/lib/auth/password-reset-store";

// Upper bound for the after() task (rate limit, token, Resend send, audit).
// On Vercel, after() keeps the invocation alive via waitUntil for up to this long.
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleForgotPasswordRequest(request, {
    schedule: after,
    process: (input) => processForgotPasswordRequest(input, createForgotPasswordDeps()),
  });
}
