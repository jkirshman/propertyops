# POLISH-1 — Home Brief + Profile + Notification Preferences

## 1. Objective

Turn the Home page from a placeholder welcome message into a personalized
"what needs my attention" operational brief, and add a proper user-facing
Profile area with grouped Notification Preferences, built on the existing
notification foundation.

## 2. Why This Phase Exists

The current Home page (`src/app/(app)/page.tsx`) shows a static welcome
message and, if the user can view the calendar, an `UpcomingOperationsPanel`.
It surfaces nothing personalized and nothing exception-based. There is no
user-facing Profile page anywhere in the app, and no UI to manage the
`notification_preferences` table that already exists in the schema (only an
admin-facing "send a test notification" tool exists today, in
`src/app/(app)/admin/notifications/page.tsx`). Staff have no way to see, at a
glance, what is overdue or urgent across the modules they have access to, and
no way to control what they get notified about.

## 3. Current-State Observations

- Home page: static text plus a conditionally-rendered calendar panel gated on
  `CALENDAR_CAPABILITIES.VIEW`. No other module's data is queried.
- `users` table (`src/db/schema.ts`) has exactly: `email`, `displayName`,
  `isActive`, `roleId`, `organizationId` — no bio/avatar/phone/timezone
  fields. There is no Profile page or route.
- `notification_preferences` already exists: one row per
  `(userId, category)` with `inAppEnabled`/`emailEnabled` booleans. Nothing in
  the app currently writes to or reads from it for preference **display** —
  it is schema-ready but has no UI.
- `NOTIFICATION_TYPES` (`src/lib/notifications/types.ts`) currently defines
  ~19 granular type identifiers (e.g. `work_order.assigned`,
  `preventive_maintenance.overdue`, `compliance.expiring_soon`,
  `lease.renewal_option_approaching`). These are **type** identifiers, not the
  **category** the preferences table keys on — no category taxonomy exists
  yet in code; `category` is a free-text column with no enumerated values
  populated today.
- **There is no property-level or location-level access-scoping model in the
  codebase today.** Every `organization_id`-scoped query returns all rows for
  the organization; visibility is controlled only by **capability**, not by
  which properties a user is tied to. (Confirmed: no `property_access` /
  `user_properties` table or equivalent exists.) This is a hard constraint on
  what "personalized based on property/location access" can mean in this
  phase — see Section 4's decision.
- Existing per-module data usable for an exceptions brief, with their exact
  due/expiration/status semantics already implemented:
  - Work Orders: `WORK_ORDER_STATUSES` non-terminal set
    (`new`/`open`/`in_progress`/`waiting`), `priority`
    (`low`/`normal`/`high`/`urgent`).
  - Preventive Maintenance: `preventive_maintenance_plans.nextDueAt` (date),
    `isActive`.
  - Inspections: `inspections.scheduledDate`/`scheduledStartAt`, `status`.
  - Compliance: `classifyComplianceRecordStatus()` already derives
    `current`/`expiring_soon`/`expired`/`no_expiration` from
    `expirationDate` with a 30-day `COMPLIANCE_EXPIRING_SOON_DAYS` threshold.
  - Leases: `src/lib/leases/alerts.ts` already provides
    `isLeaseExpiringWithin`, `isDateApproaching` (for `noticeDate`,
    `renewalOptionDate`) — directly reusable, no new date logic needed.
  - Equipment: `EQUIPMENT_CONDITIONS` (`good`/`fair`/`poor`/`unknown`),
    `EQUIPMENT_STATUSES` (`active`/`out_of_service`/`retired`).
  - Operational Events: `operational_events` (manual calendar entries).
- Each module already has a `VIEW` capability
  (`property.view`, `work_order.view`, `preventive_maintenance.view`,
  `inspection.view`, `compliance.view`, `lease.view`, `equipment.view`).

## 4. Required Behavior

### Home Brief

The Home page becomes an **App Brief** answering "what needs my attention,"
replacing the current static welcome text (the existing calendar panel may
remain, positioned as one section of the brief rather than the only content).

**Decided: personalization scope.** Since no property/location access-scoping
model exists, the brief is personalized by **organization + capability only**
in this phase: a section appears if and only if the current user's role
grants that module's `VIEW` capability. This is not a compromise for later —
it is the correct behavior given the current authorization model, and is
explicitly documented so a future session does not attempt property-level
filtering here without first checking whether POLISH-5 has introduced a
property-access model. If it has, the brief should be revisited to add
property-level filtering as a follow-on, not as part of this phase.

The brief must show, per section, only **actionable exceptions and upcoming
deadlines** — never a full list of every record. Each section has:

- **Overdue Work Orders** — non-terminal Work Orders whose implied urgency
  (age since `openedAt`, or `priority = urgent`/`high`) merits surfacing.
  Decided: "overdue" for a Work Order (no due-date field exists on
  `work_orders`) means open longer than a fixed threshold (7 calendar days
  from `openedAt`) OR `priority` is `urgent`. This must be a named constant
  (e.g. `WORK_ORDER_STALE_THRESHOLD_DAYS = 7`), not a magic number.
- **High/Urgent Work Orders** — non-terminal Work Orders with
  `priority IN (high, urgent)`, regardless of age.
- **Preventive Maintenance due/overdue** — plans where `nextDueAt <= today`
  and `isActive = true`.
- **Inspections due/overdue** — inspections with `status` not in a completed
  state and `scheduledDate <= today + 7 days` (reuse the lease "approaching"
  pattern: `isDateApproaching`-equivalent threshold).
- **Compliance expiring/expired** — records where
  `classifyComplianceRecordStatus(...)` returns `expiring_soon` or `expired`.
  Reuse the function directly; do not reimplement the threshold.
- **Lease milestones approaching** — reuse `isLeaseExpiringWithin`,
  `isDateApproaching` against `endDate`, `noticeDate`, `renewalOptionDate`.
- **Scheduled operational events** — `operational_events` and other
  calendar-projected items in the next 7 days (the existing
  `UpcomingOperationsPanel` logic already computes this; reuse it rather than
  duplicating calendar-window math).
- **Equipment in Poor/Out-of-Service condition** — included only if it can be
  shown cleanly with the data already available
  (`propertyEquipment.condition = 'poor'` or `status = 'out_of_service'`);
  decided as **in scope**, since both fields already exist and require no new
  modeling.

An Administrator (a role whose capabilities include every module's `VIEW`
capability, in practice the seeded admin role) sees every section the data
supports, portfolio-wide. A role with only a subset of `VIEW` capabilities
sees only the corresponding sections — never an empty capability check
silently rendering nothing with no explanation; a section that would be
empty of *data* still renders with a "nothing needs attention here" state,
but a section the user lacks *capability* for does not render at all.

**Explicitly deferred**: Tenant portal/login behavior. This phase's brief is
for authenticated staff users only; it does not add any tenant-facing view.

### Profile

A new user-facing Profile area (e.g. `/profile`), linked from `AppHeader`
(where `displayName`/`email` are already shown but not clickable).

At minimum:

- Display `displayName`, `email` (read-only in this phase — see Section 12;
  changing email affects login and is out of scope here).
- Display role name (read-only).
- Notification Preferences (below), embedded in the same Profile area, not a
  separate top-level nav item.

### Notification Preferences

Grouped, not granular. **Decided**: do not expose the ~19 raw
`NOTIFICATION_TYPES` identifiers individually in the UI. Instead, introduce a
small, fixed **preference category** vocabulary that groups related
notification types, and have every notification-creation call site map its
`type` to one category when checking/writing preferences. Proposed categories
(final naming decided at implementation time against the existing
`NOTIFICATION_TYPES` groupings, but the shape is decided here):

- Work Orders (`work_order.*`)
- Preventive Maintenance (`preventive_maintenance.*`)
- Inspections (`inspection.*`)
- Compliance (`compliance.*`)
- Leases (`lease.*`)
- Equipment (`equipment.*`, `asset.*`)

For each category, the user controls two toggles: **In-App** and **Email**
(mapping directly onto `notification_preferences.inAppEnabled` /
`emailEnabled`). No SMS toggle, ever, per the global decision. No per-type
granularity in the UI.

## 5. Data/Model Implications

- **No schema change required for the brief itself** — it is read-only across
  existing tables.
- **Profile**: no schema change — the profile page reads/displays existing
  `users` columns. If Section 12's future editable-fields question is
  resolved toward allowing display-name edits, that reuses the existing
  `displayName` column; no migration.
- **Notification Preferences category vocabulary**: the `category` column on
  `notification_preferences` already exists as free text with no enumerated
  values populated. This phase must define the fixed category list as a
  TypeScript constant (mirroring the `NOTIFICATION_TYPES` pattern) and update
  every notification-creation call site's category mapping; the column itself
  needs no migration, only population going forward (existing rows, if any
  were ever manually inserted, are of unknown category — treat any row with
  an unrecognized category value as belonging to a generic/default category at
  read time so the UI never breaks on legacy data).

## 6. UI/UX Expectations

- Home page should feel like a **concise morning operations brief**, not a
  dashboard wall: a short vertical list of sections, each capped (e.g. top 5
  items with a "view all N" link into the relevant module's filtered list
  view), not paginated tables embedded on the home page.
- Empty sections (capability present, no data) render a brief positive
  state ("No overdue work orders"), not blank space, so the user can trust the
  absence of an item means "checked, nothing due" rather than "didn't load."
  Sections the user lacks capability for are omitted entirely, not shown
  disabled.
  section is one visual block.
- Profile page is a single, simple form-like page — no tabs needed at this
  scale (name/email/role display + one notification-preferences panel).
- Notification Preferences render as a small table/list: one row per category,
  two checkboxes (In-App, Email) per row. No nested settings.

## 7. Authorization/Capability Considerations

- No new capability is required to view one's own Profile or manage one's own
  Notification Preferences — these are inherently self-scoped to the
  authenticated user (the same principle already implicit in
  `notification_preferences.userId` and in-app notifications being scoped to
  `recipientUserId`). Every authenticated user may view/edit only their own
  profile and preferences; there is no "manage another user's preferences"
  capability in this phase (that belongs, if ever needed, to POLISH-5's admin
  user management, not here).
- Home Brief sections are gated purely by the existing per-module `VIEW`
  capabilities already defined; no new capability is introduced.

## 8. Notifications/Email Considerations

- This phase does not add new notification **types** — it adds a **category**
  grouping layer on top of existing types, and a UI to manage the existing
  `notification_preferences` table.
- Every existing notification-creation call site (`createNotification(...)`
  callers across `src/lib/*/notification-events.ts`) must, when creating a
  notification, check the recipient's preference for that notification's
  category before deciding whether to also attempt an email send (in-app
  creation itself is unaffected by preference — a notification row is always
  created for the audit/inbox trail; the preference only gates whether an
  email is additionally sent, consistent with `inAppEnabled`/`emailEnabled`
  being independent toggles). If this gating does not already exist in
  `createNotification`, implementing it is in scope for this phase, since a
  preferences UI with no enforcement behind it would be misleading.
- No SMS.

## 9. Audit Requirements

- Changes to a user's own notification preferences should be recorded via the
  existing generic `audit_log` (`entityType: "notification_preference"`,
  `actorUserId` = the user themselves, before/after the changed
  `inAppEnabled`/`emailEnabled` values).
- No audit requirement for viewing the Home Brief (read-only, no mutation).

## 10. Migration Considerations

None required for the Home Brief or Profile display. If implementation
chooses to add any new `users` columns for future profile fields (see
Section 16), that would be an additive nullable-column migration — not
required by this phase's decided scope.

## 11. Backward Compatibility

- Existing `notification_preferences` rows (if any exist) remain valid;
  category values not in the new fixed vocabulary must not crash the
  preferences UI (see Section 5).
- The existing `UpcomingOperationsPanel` component/logic should be reused
  inside the new Home Brief rather than duplicated or removed outright.
- `AppHeader`'s existing `displayName`/`email` display is preserved; this
  phase only makes it link to the new Profile page.

## 12. Explicit Out-of-Scope Items

- Tenant portal/login behavior of any kind.
- SMS notifications.
- Per-notification-type (as opposed to per-category) preference controls.
- Editing email address from the Profile page (email is tied to login/session
  identity and changing it safely is a separate concern).
- Avatar/photo upload for user profiles.
- Any property/location-level access-scoping model — the brief's
  personalization boundary in this phase is capability-only, as decided in
  Section 4.
- Any change to how notifications are created today beyond adding
  category-based email gating (Section 8).

## 13. Dependencies

None. This phase only reads existing modules' data and extends the existing
notification foundation.

## 14. Acceptance Criteria

- Home page renders a brief with only the sections the current user's
  capabilities permit, each showing correctly-computed exceptions (verified
  against the existing pure functions: `classifyComplianceRecordStatus`,
  `isLeaseExpiringWithin`, `isDateApproaching`) — no full unfiltered lists.
- An admin-capability user sees every applicable section; a limited-capability
  user (e.g. Work Orders view only) sees only the Work Orders sections.
- `/profile` exists, shows name/email/role, and shows a working Notification
  Preferences panel with In-App/Email toggles per category.
- Toggling a preference persists to `notification_preferences` and is
  reflected on reload.
- Disabling Email for a category suppresses email sends for that category's
  notification types going forward, while in-app notification rows continue
  to be created.
- No SMS-related code or UI exists.

## 15. Manual Verification Checklist

1. Log in as a full-capability (admin) user; confirm every applicable Home
   Brief section renders with real data pulled from seeded/test records.
2. Log in as a role with a narrow capability set (e.g. only
   `work_order.view`); confirm only the Work Orders sections render.
3. Create an overdue Work Order (`openedAt` > 7 days ago, non-terminal
   status) and confirm it appears in the "Overdue Work Orders" section; move
   it to `resolved` and confirm it disappears.
4. Create a compliance record with `expirationDate` 10 days out; confirm it
   appears under "Compliance expiring/expired" with the `expiring_soon`
   classification; confirm a record with no `expirationDate` does not appear.
5. Visit `/profile`; confirm displayed name/email/role match the logged-in
   user.
6. Toggle a category's Email preference off; trigger a notification of that
   category (e.g. via the existing admin "send test notification," if its
   category is mapped, or via a real event); confirm no email is sent while
   the in-app notification still appears in the bell.
7. Confirm a user with no notification-related capability restriction can
   still reach and edit their own `/profile` (self-service, capability-free).

## 16. Open Questions

- Final wording/grouping of the notification preference categories (Section 4
  lists a proposed set derived directly from existing `NOTIFICATION_TYPES`
  prefixes) should be confirmed with the business before implementation, since
  it is user-facing copy, not an architectural decision.
- Whether future profile fields beyond name/email/role (e.g. a phone number
  for on-call contact) are wanted is not resolved here; this phase's Profile
  page is intentionally minimal per the brief's own "at minimum" framing.
