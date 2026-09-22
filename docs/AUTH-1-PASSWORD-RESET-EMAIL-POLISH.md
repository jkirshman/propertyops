# AUTH-1 — Native Password Reset + Account Email Polish

## Scope

- Part A: self-service password reset (`/forgot-password` → email → `/reset-password`).
- Part B: shared transactional layout for the account invitation and password reset emails.

Out of scope (unchanged): ACCESS-1 authorization semantics, MFA/SSO/tenant login,
DNS/SPF/DKIM/DMARC/SES/Resend configuration, notification email templates.

## Architecture

| Piece | Location |
| --- | --- |
| Decision logic + orchestrators (I/O injected, unit-tested) | `src/lib/auth/password-reset.ts` |
| DB-backed dependencies | `src/lib/auth/password-reset-store.ts` |
| Client-safe copy (generic response, invalid-link text) | `src/lib/auth/password-reset-messages.ts` |
| DB-backed rate limiter | `src/lib/auth/rate-limit.ts` |
| Shared email layout (HTML + text) | `src/lib/email/transactional-layout.ts` |
| Invite / reset email builders | `src/lib/email/account-emails.ts` |
| Routes | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/validate`, `POST /api/auth/reset-password` |
| Pages | `/forgot-password`, `/reset-password`, "Forgot password?" link on `/login` |

### Tokens (`password_reset_tokens`)

- 32 bytes from `crypto.randomBytes`, hex. Only the SHA-256 hash is stored.
- Expires after 60 minutes. Single use: `used_at` gets set by a conditional
  `UPDATE … WHERE used_at IS NULL AND invalidated_at IS NULL`, so only one
  concurrent submission can win.
- A new request invalidates the user's outstanding tokens (`invalidated_at`).
  A completed reset invalidates every other outstanding token.
- Separate from `users.activation_token_*`: activation handles onboarding and
  reset handles recovery. The two never share a token.

### Request flow

The route validates the email's shape and returns the same
`FORGOT_PASSWORD_RESPONSE` for every well-formed request. All work that depends
on the account runs in `after()` once the response has been sent: rate
limiting, lookup, token issue, send, and audit. The body, status and response
timing therefore don't depend on account state.

A token and email are issued only for users who are **active** and **not
pending activation**. Password reset never reactivates a deactivated account
and never stands in for an invite.

### Completion flow

1. Hash the token and look up the row.
2. Check that it is usable: not used, not invalidated, not expired.
3. Check that the user is eligible. If not, the token is burned.
4. Hash the new password with the existing scrypt helper.
5. Claim the token atomically.
6. In one `db.batch` (a transaction on neon-http): update the password,
   invalidate the other tokens, and delete **all** of the user's sessions.
7. Audit the reset, clear the cookie, and redirect to `/login?reset=1`. The user is not signed in automatically.

### Rate limiting (`auth_rate_limit_events`)

Fixed windows backed by the database, because in-memory counters don't survive
across serverless instances. There are two buckets:

- 3 requests per 15 minutes for each email.
- 10 requests per 15 minutes for each client IP (from `x-forwarded-for`).

Keys are SHA-256 hashes. Every request is recorded, including requests for
emails with no account. Rows older than 24 hours are pruned opportunistically.
The table is not scoped to an organization: it is pre-authentication security
infrastructure, like `sessions`, not a business record.

### Audit

| Action | When | Metadata |
| --- | --- | --- |
| `auth.password_reset_requested` | known user | `outcome` (`email_sent` / `email_not_sent` / `inactive` / `pending_activation` / `not_configured`), `invalidatedPriorCount`, `expiresAt` |
| `auth.password_reset_rate_limited` | known user, over limit | none |
| `auth.password_reset_completed` | success | `revokedSessionCount`, `invalidatedTokenCount` |

Requests for unknown emails are not audited, because `audit_log` requires an
organization. Audit rows never contain a token, token hash, URL, or password.

### Email

- The From header comes from `formatFromAddress()`. A display-named
  `EMAIL_FROM_ADDRESS` is used verbatim. A bare address becomes `PropertyOps <address>`.
- `sendTrackedEmail` now accepts `text`. Account emails always send both HTML and text.
- `email_send_attempts` keeps only the masked recipient, subject and kind. Bodies,
  URLs and tokens are never stored there.
- Kinds: `user_invitation` (kept as-is so existing history stays continuous) and
  `password_reset`. Email Admin shows these as "Account invitation" and "Password reset".
- Reset emails always go through `sendTrackedEmail`, so with `EMAIL_ENABLED=false` a
  `skipped_disabled` row is recorded. Invite sending is still gated by
  `isEmailSendingEnabled()` at the call site, as it was before AUTH-1.

## Migration

`drizzle/0015_auth_1_password_reset.sql` is additive only. It creates two tables
and their indexes. Apply it with `npm run db:migrate` against the target database.

## Known limitations

- The rate limiter counts first and inserts second, which isn't atomic. A tight
  concurrent burst can go over a limit by one or two requests.
- Someone who knows a victim's email can use up that email's bucket for 15
  minutes. This is the usual tradeoff with per-email throttling.
- IP hashes are unsalted SHA-256, so the IPv4 space is enumerable. They are
  kept for 24 hours at most.
- The invite HTML deliberately shows no copy-paste URL, only the button. The
  plain-text part carries the URL.

## AUTH-1A closeout

- **Post-response execution.** The request work runs in Next.js `after()`,
  which is the framework-supported mechanism. On Vercel it is backed by
  `waitUntil`, so the invocation stays alive until the task settles, up to
  the route's `maxDuration`, now set explicitly to 60 seconds. The route now
  delegates to `handleForgotPasswordRequest` in
  `src/lib/auth/forgot-password-handler.ts`, with `after` injected as the
  scheduler, so tests can check the execution path. The response is still
  identical for every account state. This is best-effort within the
  invocation, not a durable queue. If the invocation crashes, that one request
  is lost and the user has to ask again. It is never silently dropped by the
  runtime while the function is healthy.
- **Deactivation.** `updateUser({ isActive: false })` now runs the user update
  and the invalidation of outstanding reset tokens in one `db.batch`, a single
  transaction. The invalidation is scoped by user and organization.
  Reactivating the user never makes an earlier token usable again. Completing
  a reset still re-checks `isActive` as a second layer.
