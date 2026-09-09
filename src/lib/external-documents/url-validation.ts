/**
 * Safety gate for user-supplied external document URLs (POLISH-4). Deliberately
 * an allowlist (https only), not a denylist of dangerous schemes — a denylist
 * would need to anticipate every unsafe scheme (javascript:, data:, file:,
 * vbscript:, ...), while an allowlist rejects all of them by construction.
 * Never verifies reachability — PropertyOps never fetches the destination.
 */
export function isSafeExternalUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "https:";
}

/**
 * Strips query string and hash before a URL is written to audit_log, so a
 * SharePoint sharing token (or any other secret embedded in a query param)
 * never lands in audit history. Falls back to the raw input if it somehow
 * isn't a valid URL at this point (validation should already guarantee it is).
 */
export function sanitizeUrlForAudit(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value;
  }
}
