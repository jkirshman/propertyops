import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time secret comparison. Fails closed: an unconfigured expected
 * secret (misconfiguration) never authenticates, regardless of what's provided.
 */
export function verifyCronSecret(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!expected || !provided) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function verifyCronRequest(request: Request): boolean {
  const header = request.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;
  return verifyCronSecret(provided, process.env.PROPERTYOPS_CRON_SECRET);
}
