# POLISH-5 — Admin Hub Users/Access + Email Administration

## 1. Objective

Make the existing platform foundations manageable from the Admin Hub: build
real Users/Access management (Part A) on top of the existing Role/Capability
model, and build out Email Administration (Part B) on top of the existing
Resend/audit foundation, replacing today's placeholder pages with working
admin tools.

## 2. Why This Phase Exists

`src/app/(app)/admin/users/page.tsx` and `src/app/(app)/admin/roles/page.tsx`
are Admin Hub tiles that currently exist as **navigation placeholders only** —
the Users & Access tile explicitly renders "User management workflows are not
built yet." Meanwhile `src/app/(app)/admin/email/page.tsx` already shows
basic Email config status (enabled/API key/from address) and a test-send
button, but does not surface the `email_send_attempts` audit trail that
already exists in the schema and is already being written to on every send.
Both gaps mean the platform foundation described in PROP-0 (real role/
capability model, email audit) exists in the database and backend but is not
actually operable by an administrator through the UI.

## 3. Current-State Observations

### Part A — Users / Access

- `users` (`src/db/schema.ts:72`): `organizationId`, `roleId` (single
  required FK — **one role per user**, not a many-to-many user-roles join),
  `email`, `passwordHash`/`passwordSalt`, `displayName`, `isActive`.
- `roles` → `role_capabilities` → `capabilities` is already a real,
  non-boolean capability model (`src/db/schema.ts:32-70`). `roles` are
  org-scoped; `capabilities` are a fixed, platform-defined, non-org-scoped
  vocabulary (per the schema's own comment). This is exactly the "real role/
  capability model" the brief requires be respected — **this phase must not
  regress it to boolean columns on `users`.**
- `getRoleCapabilityKeys(roleId)` (`src/lib/auth/capabilities.ts`) already
  computes a role's effective capability keys — directly reusable for an
  "inspect effective permissions" admin view; no new query logic needed for
  that specific feature.
- `src/app/(app)/admin/roles/page.tsx` exists as a route but its actual
  implementation was not inspected in depth for this document; implementation
  must re-check its current state (it may already be more built out than the
  Users page, or may be an equivalent placeholder) before assuming a blank
  slate for role management specifically. This document's scope is written
  assuming role **assignment to users** and **effective-permission
  inspection** are the missing pieces; if role/capability CRUD itself is
  already further along than Users management, that reduces this phase's
  remaining work but does not change its required behavior below.
- **No property/location access-scoping model exists in the codebase.**
  There is no `property_access`, `user_properties`, or equivalent table.
  Every capability-gated query today returns all organization-scoped rows —
  visibility is controlled by capability alone, never by which properties a
  user is tied to. This is the single largest open architectural question in
  this phase (see Section 4/16).
- No session/security-action UI (e.g. "force logout," "view active
  sessions") exists yet, though `sessions` (`src/db/schema.ts:93`) has the
  data (`tokenHash`, `createdAt`, `expiresAt`) to support at least a
  "revoke all sessions for this user" action safely (delete matching
  `sessions` rows for that `userId`).
- No invite-by-email flow exists; user creation today (wherever it happens —
  likely only via `scripts/seed.ts` or a not-yet-built admin form) sets
  `passwordHash`/`passwordSalt` directly. `src/lib/auth/password.ts` already
  provides the hashing primitives to reuse.

### Part B — Email Administration

- `email_send_attempts` (`src/db/schema.ts:163`) already stores, per attempt:
  `toEmailMasked` (already masked at write time — confirmed by
  `src/lib/email/mask-email.ts` existing as a dedicated utility),
  `subject`, `kind`, `status`, `failureReason`, `providerMessageId`,
  `createdAt`. **This table is already written to on every send** (per
  `src/lib/email/email.ts`'s `sendTrackedEmail`-style foundation described in
  PROP-0) but **has no admin UI reading from it today** — the current
  `/admin/email` page shows only config status and a test-send button, not
  history.
- `getEmailConfigStatus()` (`src/lib/email/config.ts`) already exposes
  `enabled`, `hasApiKey`, `hasFromAddress` — booleans only, **no secret
  values are exposed**, which is exactly the safe pattern this phase must
  continue.
- `EMAIL_ENABLED` kill switch already exists and already defaults off
  (`isEmailSendingEnabled` requires the literal string `"true"`).
- `SendTestEmailButton` component already exists and is already wired into
  the current Email admin page — reusable as-is.

## 4. Required Behavior

### Part A — Users / Access

Administrators (users whose role grants `ADMIN_CAPABILITIES.USERS`) must be
able to, from `/admin/users`:

- **List users**: display name, email, role name, active/inactive state,
  with search/filter by active state and role.
- **Create/invite a user**: name, email, role selection (from the
  organization's existing `roles`). Decided: **email-invite flow** (send a
  set-password link via the existing Email foundation) rather than an admin
  directly setting an initial password, since a directly-admin-set password
  would require it to be communicated out-of-band insecurely. This reuses
  Part B's Email foundation, not a new email mechanism — one more reason
  this phase treats both parts as belonging together administratively even
  though they are functionally separate.
- **Edit a user**: display name, email, role reassignment. Role
  reassignment writes `users.roleId` directly (single-role model preserved,
  no join table introduced).
- **Deactivate/reactivate a user**: toggles `users.isActive`. Deactivating a
  user must also **revoke all of that user's active sessions** (delete their
  `sessions` rows) so deactivation takes effect immediately rather than only
  blocking future logins while an existing session stays valid until natural
  expiration.
- **Inspect effective permissions**: given a user (via their `roleId`), show
  the full list of granted capability keys, using the existing
  `getRoleCapabilityKeys` — read-only, for admin visibility/debugging, not an
  editing surface (capability grants are edited on the Role, not per-user).
- **Manage property access, if/when a scoped-access model exists**: **decided
  as a documented architectural gap, not implemented in this phase.** No
  property/location-scoping table exists today, and building one is a
  genuine new relational model (a `property_access` or
  `user_property_access` join table, or a coarser
  `property_company`-level grant once POLISH-2 ships) that the business has
  not yet specified requirements for (which roles need scoping at all; does
  it need to support "all properties," "specific properties," and
  "properties under a Property Company," the same three-tier shape
  `vendors.coverageMode`/`vendor_property_coverage` already uses for Vendor
  coverage). Decided: **this phase ships Users/Access management without
  property-scoped visibility**, and documents the exact shape a follow-on
  phase would need (Section 16) rather than guessing at requirements not yet
  given. This is consistent with POLISH-1's decision to scope its Home Brief
  by capability only, for the same underlying reason.
- **Session/security actions**: "Revoke all sessions" as an explicit admin
  action on a user's detail view (beyond the automatic revoke-on-deactivate
  above), for cases like a suspected compromised session where the account
  should stay active but be forced to re-authenticate.

Role management (`/admin/roles`) requirements, to the extent not already
built (re-verify current state first, per Section 3):

- List roles with their granted capabilities.
- Create a new role (name, slug) and toggle which capabilities it grants —
  writing to `role_capabilities`, never adding a column to `users`.
- Prevent deleting a role that has active users assigned (the existing FK
  `users.roleId → roles.id` is `onDelete: "restrict"`, so the database
  already prevents this at the constraint level — the UI must surface that
  constraint as a clear validation message, not a raw FK-violation error).

### Part B — Email Administration

Building directly on the existing foundation, `/admin/email` gains:

- **Display** (already present, keep as-is): enabled/disabled state,
  configured sender identity (from address), API key configured (boolean
  only).
- **New: Delivery/send history** — a table reading `email_send_attempts`,
  showing: masked recipient (`toEmailMasked`, already masked — never
  re-derive or display an unmasked address), message/event type (`kind`),
  subject, timestamp (`createdAt`), success/failure state (`status`), and a
  **sanitized** failure reason (`failureReason` — this column is already
  described as "sanitized" per PROP-0's account of the foundation; if
  implementation finds any raw provider error text leaking through in
  practice, sanitizing it is in scope for this phase, since displaying it to
  an admin is still displaying it to a user of the app).
- **Test-email action**: already exists (`SendTestEmailButton`) — keep, no
  change required unless it needs to also appear correctly alongside the new
  history table (i.e., a test send should show up in the history list
  immediately after use, which it will automatically since it goes through
  the same `email_send_attempts` write path).
- Pagination or a reasonable row cap (e.g. most recent 100) on the history
  table, since send volume will grow indefinitely — this is an
  implementation-detail requirement, not a product decision, but must not be
  skipped (an unbounded query against `email_send_attempts` is a real
  performance risk once the table has meaningful history).

**Must not expose**: API keys, secrets, raw tokens, or unmasked recipient
addresses anywhere in this UI. **Must not build**: a full visual
email-template designer in this phase — a future template-management layer
may be documented (Section 16) as a possible extension only, not designed or
scaffolded now.

## 5. Data/Model Implications

**Part A**: no schema change required for user CRUD, role assignment,
deactivation, or effective-permission inspection — all of it is achievable
against the existing `users`/`roles`/`role_capabilities`/`capabilities`/
`sessions` tables. If role management (Section 4) is not already built, it
too requires no new tables (writes to existing `roles`/`role_capabilities`).
No property-access table is created in this phase (see Section 4's decision
and Section 16).

**Part B**: no schema change required — `email_send_attempts` already has
every column this phase's UI needs.

## 6. UI/UX Expectations

- `/admin/users`: list + detail pattern (matching the existing Admin Hub
  taxonomy pages' list/detail convention already used for e.g. Property
  Types, Vendor Categories). Detail view shows profile fields, role
  dropdown, active/inactive toggle, effective-permissions read-only list,
  and a "Revoke all sessions" action with a confirmation step (a
  hard-to-reverse-feeling action, even though the user can simply log back
  in — confirm before acting, consistent with the app's general caution
  around consequential actions).
- Invite flow: a simple form (name, email, role) that, on submit, creates the
  user in an inactive-until-first-login or pending state (implementation
  detail) and sends an invite email via the existing Email foundation.
- `/admin/roles`: list of roles, each showing a capability checklist grouped
  by domain (mirroring how `ADMIN_TILE_GROUPS` already groups Admin Hub tiles
  by domain — reuse that grouping concept for capability display so the list
  of dozens of capability keys doesn't render as one flat unreadable list).
- `/admin/email`: existing status card retained at the top; new history
  table below it, most-recent-first, with status shown as a clear
  success/failure badge (not a raw status string).
- Follows the existing validation UX standard throughout.

## 7. Authorization/Capability Considerations

- Users/Access continues to use the existing `ADMIN_CAPABILITIES.USERS` (for
  the Users tile) and `ADMIN_CAPABILITIES.ROLES` (for the Roles tile) —
  already defined, already wired into `ADMIN_TILES`. No new capability keys
  are required for this phase's Part A scope.
- Email Administration continues to use the existing
  `ADMIN_CAPABILITIES.EMAIL` — already defined, already wired.
- **Explicitly decided**: this phase does not introduce a new
  "property-scoped admin" capability, since property-scoped access itself is
  out of scope (Section 4). Any future property-access model should introduce
  its own capability/authorization shape at that time, documented as its own
  phase.

## 8. Notifications/Email Considerations

- The **invite-user** flow is itself a new email use case built on the
  existing Email foundation — it must go through `email_send_attempts`
  exactly like every other tracked send, so it appears in Part B's own
  history table (dogfooding the audit trail this phase also builds a UI
  for).
- No new notification **types** (in the `notifications` table sense) are
  required for this phase — user invite/deactivation are administrative
  actions communicated via email and the audit log, not in-app notifications
  to other users.

## 9. Audit Requirements

- User create, edit, role change, deactivate, reactivate, and
  "revoke all sessions" are all recorded via the existing generic
  `audit_log` (`entityType: "user"`), with role changes explicitly recording
  before/after `roleId` (and ideally before/after role **name**, resolved at
  write time, so the audit trail remains readable even if a role is later
  renamed or deleted-and-recreated).
- Role creation/edit and capability-grant changes are recorded via
  `audit_log` (`entityType: "role"`), with before/after capability key lists.
- Viewing the Email send-history table is read-only and requires no audit
  entry; the sends themselves are already captured by
  `email_send_attempts`, which this phase treats as the audit trail for
  email — no duplicate `audit_log` entry per email send is required.

## 10. Migration Considerations

None. This phase is UI/service-layer work against existing tables. If a
follow-on property-access model is scoped later (Section 16), that will
require its own migration at that time — not part of this phase.

## 11. Backward Compatibility

- No existing `users`, `roles`, `role_capabilities`, or
  `email_send_attempts` row is altered in shape. This phase only adds UI and
  service functions that read/write those tables through their existing
  columns.
- Deactivating a user and revoking sessions is a new **capability** for
  admins, not a new automatic behavior applied to any existing account —
  no existing user is affected until an admin explicitly acts.

## 12. Explicit Out-of-Scope Items

- Any property/location access-scoping model or UI (documented as a
  dependency-worthy gap in Section 16, not built here).
- A full visual email-template designer.
- Multi-role-per-user (the model remains one `roleId` per user).
- Any enterprise IAM features (SSO, SCIM provisioning, MFA) — explicitly
  called out in the brief as not wanted ("do not build an enterprise IAM
  product").
- Exposing API keys, secrets, or unmasked recipient addresses anywhere.
- Any change to how `email_send_attempts` rows are written (this phase only
  reads them for display).

## 13. Dependencies

Soft dependency on POLISH-2 (Property Company) only for the **design
question** of what a future property-access model should key on (Section 16)
— this phase ships without that model regardless of POLISH-2's status, so it
is not a hard blocker.

## 14. Acceptance Criteria

- An admin can list, search, create/invite, edit, deactivate, and reactivate
  users from `/admin/users`.
- Deactivating a user immediately revokes their active sessions; they cannot
  continue using an already-open session after deactivation.
- An admin can view a user's effective capabilities (derived from their
  role) in a read-only list.
- An admin can create a role and assign it capabilities (if not already
  possible), and reassign a user's role.
- Attempting to delete a role with assigned users shows a clear, non-raw-
  error validation message rather than a database error.
- `/admin/email` shows the existing config status plus a working, paginated
  (or capped) send-history table sourced from `email_send_attempts`, with
  masked recipients and sanitized failure reasons only.
- No secrets, API keys, or unmasked recipient data appear anywhere in the
  Admin Hub Email or Users UI.

## 15. Manual Verification Checklist

1. Create a new user via invite; confirm the invite email appears in the
   Email history table with the correct masked recipient and a success
   status (assuming `EMAIL_ENABLED=true` and valid config in the test
   environment; if not configured, confirm the attempt is still recorded
   with an appropriate failure status rather than silently doing nothing).
2. Edit the new user's role; confirm effective permissions update
   accordingly in the read-only inspection view.
3. Deactivate the user; confirm their existing session (if logged in
   elsewhere) is invalidated and they are redirected to login on next
   request.
4. Reactivate the user; confirm they can log in again (with a fresh
   session/credential flow, per the invite/reset mechanism chosen).
5. Attempt to delete a role that has an assigned user; confirm a clear,
   friendly validation message, not a raw database/FK error.
6. Send a test email from `/admin/email`; confirm it appears at the top of
   the history table within the same page load/refresh.
7. Confirm no page in this phase ever renders `RESEND_API_KEY` or any other
   secret value, and no recipient email is shown unmasked.
8. Confirm a non-admin (no `users.manage`/`email.manage` capability) cannot
   reach `/admin/users` or `/admin/email` (should be blocked the same way
   other capability-gated Admin Hub tiles already are, via
   `requireAdminCapability`).

## 16. Open Questions

- **Property-access scoping model**: the business has not specified which
  roles (if any) need visibility restricted to a subset of properties, nor
  whether that subset should be modeled as individual property grants, a
  Property-Company-level grant (once POLISH-2 ships), or something else. A
  reasonable future shape, modeled directly on the existing
  `vendors.coverageMode`/`vendor_property_coverage` pattern, would be: a
  `coverageMode` on the user or role (`'all' | 'specific'`) plus a
  `user_property_access` join table populated only when `'specific'`. This
  is documented here as the recommended shape **if and when** the business
  decides property-scoped access is needed — it is not built in this phase.
- Whether user invitation should require the invited user to set their own
  password via a emailed link (recommended, since it avoids an admin ever
  knowing another user's password) versus some other flow is assumed
  resolved in Section 4's decision, but should be confirmed against any
  existing auth UX conventions in the login flow before implementation, to
  ensure the invite-acceptance page matches the existing login page's look
  and validation conventions.
