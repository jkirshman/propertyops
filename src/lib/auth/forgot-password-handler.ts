import { FORGOT_PASSWORD_RESPONSE } from "@/lib/auth/password-reset-messages";
import { resolveClientIp } from "@/lib/auth/password-reset";
import { forgotPasswordSchema } from "@/lib/validation/auth";

/**
 * Schedules work to run after the response is sent. In production this is
 * Next.js `after()` from next/server. It is the framework-supported
 * post-response mechanism, and on Vercel it is backed by the platform's
 * `waitUntil`, which keeps the invocation alive until the task settles (up to
 * the route's maxDuration). Never a bare unawaited promise.
 */
export type ScheduleAfterResponse = (task: () => Promise<void>) => void;

export interface ForgotPasswordHandlerDeps {
  schedule: ScheduleAfterResponse;
  process: (input: { email: string; clientIp: string | null }) => Promise<unknown>;
}

/**
 * Account-enumeration safe by construction: for any well-formed email the
 * response is always FORGOT_PASSWORD_RESPONSE, and the account-dependent work
 * runs in the scheduled task. That covers rate limiting, lookup, token issue,
 * email send, and audit. So neither the body, the status, nor the response
 * timing depends on whether, or in what state, an account exists.
 */
export async function handleForgotPasswordRequest(
  request: Request,
  deps: ForgotPasswordHandlerDeps,
): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = { email: parsed.data.email, clientIp: resolveClientIp(request.headers) };

  deps.schedule(async () => {
    try {
      await deps.process(input);
    } catch (error) {
      // Never log the email, token, or URL. Only record that processing failed.
      console.error("password reset request processing failed", error instanceof Error ? error.name : "unknown");
    }
  });

  return Response.json(FORGOT_PASSWORD_RESPONSE);
}
