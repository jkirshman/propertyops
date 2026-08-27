# PropertyOps Portability Report (PROP-0: Discovery & Portability Audit)

Prepared from a read-only inspection of the AssetOps Hub repository (`/Users/joshkirshman/equipment-intake-app`, branch `codex/freshdesk-area-warehouse-filters`, build 2230, 376 commits, 155 API routes, ~110,500 lines of TS/TSX). No code was modified, no migrations were created, and no PropertyOps repository or resources were created. This report treats AssetOps strictly as a reference implementation.

---

## 1. Executive Assessment

Building PropertyOps by learning from AssetOps is practical and worthwhile — but only as a reference for *patterns*, not as a codebase to fork. AssetOps has, over 376 commits, worked out a genuinely good shape for several things a property-management platform also needs: session/auth, area-based location scoping, a notification pipeline, a private-file-storage pattern, an email foundation with audit trails, and (most usefully) a mature native ticketing system that has already absorbed the pain of building workflow, closure, attachments, saved views, and public unauthenticated intake. Those pieces can be ported with light renaming and little architectural rework.

The major opportunity is that AssetOps already contains a rough draft of the hardest problem PropertyOps will face — modeling a canonical, non-vendor-locked asset (`assetops_assets`, built for the Company Vehicle work) — and a ticket system that has already solved public intake, rate limiting, and closure workflows without needing Freshdesk in the new design. Copying the *shape* of these systems could save months.

The major risks are three specific things that would hurt badly if copied uncritically: a single 14,874-line monolithic page component that holds roughly 13% of the entire application's code, a total absence of any real migration tool (schema is applied via hundreds of scattered `CREATE TABLE IF NOT EXISTS` statements with no version history or rollback), and a permission model that is a pile of six independently-added boolean columns on the user table rather than a real capability system. None of AssetOps's core integrations (Freshdesk, Snipe-IT, Square) are relevant to PropertyOps and should be excluded entirely, not adapted. And the one thing PropertyOps needs most that AssetOps doesn't actually have yet — a configurable equipment-template system per property type — does not exist in AssetOps in any form; it would be net-new design work, only loosely inspired by AssetOps's single hardcoded equipment catalog.

Overall verdict: AssetOps is a good case study, not a starter kit. A clean-room PropertyOps build informed by these findings should move faster and end up healthier than either a blind fork or a build with no reference at all.

## 2. Current AssetOps Architecture (Relevant Slice)

AssetOps is a Next.js App Router app on Vercel, using Postgres (Neon, serverless driver, tagged-template `sql` queries) and Vercel Blob for private files. Authentication is a custom hashed-session-token model with an httpOnly cookie and rolling 30-day expiration. Authorization layers three roles (`user`/`manager`/`admin`) with six independent boolean feature flags and an area-based location-scoping system (`operating_areas` → `operating_area_locations` → managers/ticket-leads). The application's primary UI is dominated by one very large client component (`app/page.tsx`) that hosts tabs for Intake, Inventory, Support Tickets, and My Assets; a separate, much cleaner config-driven Admin Hub (`app/admin/page.tsx`) sits alongside it for admin tooling. A native ticket system exists in parallel with, and partially entangled with, a Freshdesk mirror. Asset management is still substantially dependent on Snipe-IT for canonical hardware identity, though a newer `assetops_assets` table shows AssetOps's own attempt at a Snipe-independent asset model. Notifications flow through a generic in-app table plus a Web Push layer with a sanitized-payload policy. Email goes through a Resend-based foundation with send auditing and kill switches. Five cron routes handle scheduled sync/backup/reminder work, authenticated by shared secrets (inconsistently timing-safe). Third-party integrations include Freshdesk, Snipe-IT, Square (Event POS payments), Ecobee (SmartBuildings HVAC), Flume (water monitoring), and an N8N/MCP automation layer.

## 3. Reusable Systems

**Session/auth core** — `lib/session.ts`, `lib/assetops-session-cookie.ts`, `lib/assetops-session-refresh.ts`. Hashed random tokens, httpOnly/secure/SameSite cookie, a 30-day rolling expiration that only renews within the last day (avoiding a write on every request), race-safe conditional updates. Zero domain coupling — this is generic user/session logic and can be ported nearly verbatim. Dependency: a minimal `app_users`/`app_sessions` table pair.

**Centralized session verification** — `verifyAssetOpsSession(sessionToken, allowedRoles?)` in `lib/assetops-auth.ts` is used by roughly 90 of 155 API routes (the majority, though not all — see Technical Debt). The *pattern* of one shared verification function taking an allowed-roles array is worth reusing exactly; PropertyOps should just make adoption 100% instead of ~60%.

**Area/location access scoping shape** — `lib/location-access-scope.ts`. An "area" is a named group of location IDs; a location record carries the fields needed for scoped display. The scoping logic itself (admin sees everything; manager sees the union of locations in their assigned areas; user sees their primary location plus any lead-assigned areas) has no restaurant-specific branching and maps directly onto `property_id` in place of `location_id`. Reusable as a pattern, not as data — the underlying location list is currently a hardcoded array of 34 Michigan Pizza Hut stores that has no reuse value.

**Admin Hub configuration pattern** — `app/admin/page.tsx`'s `adminTiles`/`adminToolGroups` arrays are genuinely data-driven: tiles are defined once, grouped separately by ID, and rendered/searched generically. This is directly portable; the only gap is that gating is currently coarse (whole-hub admin-only, no per-tile `requiredRole`), which PropertyOps should add on day one rather than retrofit later.

**Notification core** — `lib/app-notifications.ts`'s `app_notifications` table (recipient, type, title, body, related module/entity/url, read state, actor, JSON metadata, dedupe key) is a genuine type+recipient+payload+deep-link model, not hardwired to specific business objects. `app_notification_preferences` layers category-level in-app/email/push toggles on top. Roughly 28-30 notification types exist today, and adding a new one touches about three files (the creation call site, a label map, and a safe-push-payload branch) — a low-friction, reusable design.

**Safe push payload policy** — `lib/safe-push-payload.ts` deliberately builds sanitized, type-specific push text with a conservative generic fallback for unrecognized types, rather than ever forwarding raw notification body text to a lock screen. This defensive design (born from a real incident where free text leaked into push) is worth adopting as a standing policy, not just a one-off fix.

**Private file storage pattern** — validate → `put(..., { access: "private" })` to Vercel Blob → Postgres row with visibility metadata → an authenticated route that resolves the session, checks per-record visibility, and streams the file server-side (never handing a raw Blob URL to the client). Demonstrated cleanly in `lib/support-ticket-attachments.ts` and its paired viewer route. Fully portable; only the path-naming convention and permission checks are AssetOps-specific.

**Email foundation** — `lib/outbound-email.ts`'s `sendTrackedEmail()` posts directly to Resend's API, journals every attempt (masked recipient, sanitized failure reason) into an audit table, and centralizes a single "is this feature actually configured and enabled" health check gating all sends behind boolean kill switches that default off. This foundation, independent of any specific email template, is directly reusable with a new Resend account and new env var names.

**Database utility layer** — `lib/db.ts` is nine lines: pick the first defined connection-string env var, return a `neon()` client. Zero AssetOps-specific setup. Copy unchanged.

**Native ticket hub-and-spoke schema shape** — one core ticket table plus loosely-coupled satellite tables (workflow, closure details, activity/audit events, notes, attachments, asset links) joined only by a numeric ticket ID. This shape is worth keeping, provided the join column is named honestly (see Exclusions) rather than reusing AssetOps's confusing `freshdesk_ticket_id` name on native data.

**Public intake pattern (token + rate limit + audit)** — a company- or location-scoped random token resolved server-side, a honeypot field, a hashed-identity rate limiter (`lib/request-rate-limit.ts`, HMAC-based, prefers platform-trusted IP headers over client-supplied ones, fails closed without a configured secret) with a reserve/release slot pattern, and a separate attempt-audit table. This maps directly onto a PropertyOps "submit a maintenance request" public form with no ticketing-vendor dependency at all — it's arguably the single most reusable subsystem in the whole codebase.

**Attachment validation** — size/count/MIME allowlist checks (`lib/support-ticket-attachments.ts`) are standalone and reusable regardless of what they're attached to.

**Person/location assignment pattern** — the `assignment_type` (`person | location | back_stock/unassigned | unknown`) plus an immutable assignment-history table, used for both IT assets and the employee-offboarding report, is a clean, generic "assign → reassign → return, with history" shape suitable for PropertyOps assets assigned to a property, tenant, or employee.

**Base-entity + type-specific-extension-table pattern** — `assetops_assets` (canonical fields: family, tag, display name, manufacturer/model/serial/condition/status, assignment type) plus a 1:1 extension table per asset family (`company_vehicle_profiles`) is a good precedent for modeling a `PropertyProfile` base entity with type-specific extension tables per property type, and for modeling equipment/assets the same way.

**Utility-integration credential pattern** — Ecobee and Flume both cache OAuth tokens only in an in-process module variable (never persisted to Postgres), redact secrets from every logged error, and run on a 15-minute cron that discovers devices rarely and refreshes readings often. If PropertyOps ever adds its own building-environment or utility monitoring, this pattern (not these vendors) is a solid template to copy.

## 4. Systems Requiring Generalization

**Location → Property.** The ALM area/location scoping logic generalizes directly, but the underlying data model needs to become a real first-class table. AssetOps doesn't actually have a `locations` table — it has a hardcoded array of 34 stores merged with a `location_profiles` table keyed to Snipe-IT IDs. PropertyOps needs its own first-class `properties` table from day one, ideally using the base-entity + extension-table shape described above rather than one wide table mixing generic and type-specific fields as `location_profiles` currently does.

**Equipment catalog → true equipment templates.** This is the most important generalization gap. AssetOps has exactly one global, hardcoded, kitchen-specific equipment list (17 items: fryers, wing coolers, maketables, dish machines) plus a sparse per-location override table — because every AssetOps location is implicitly the same "type" of restaurant, the concept of multiple templates never had a reason to exist. PropertyOps needs a genuinely new intermediate layer: `equipment_templates` (one per property type) → `equipment_template_items` (which catalog entries belong to which template, required vs. optional) → property-level overrides layered on top of whichever template a property is assigned. The reusable ingredients from AssetOps are the pattern pieces (a catalog table, a normalization/matching layer for reconciling real equipment against expected items, a status-override table) — not the data model itself, which must be built from scratch.

**Permission model → real capability system.** The three roles plus six independently-migrated boolean flags on the user table (each with its own ad-hoc column-creation helper and duplicated serialization logic across three routes) is not a design that should be re-created. PropertyOps should start with a proper role/capability join table (or a typed capability enum) so adding a new permission doesn't mean adding another column and touching three files by hand.

**Ticket workflow → drop the dual-model complexity, keep the permission shape.** AssetOps's workflow state machine itself is generic, but a large amount of its complexity exists solely to support two coexisting ticket models (Freshdesk-mirrored and native, distinguished by a sign-encoded ID trick and duplicated UNION queries in search). PropertyOps, with only one native model from day one, should drop that encoding entirely. What is worth preserving is the visibility-check shape (`canViewTicket`: requester match, assigned-record match, or location/property scope match) — that logic is clean and independent of the dual-ID hack.

**Notification event types → rename, don't restructure.** The type+recipient+payload model itself needs no rework; only the ~28 existing type names, their preference-category grouping, and their push-text branches need renaming/rebuilding for PropertyOps's own event vocabulary.

**Admin Hub → add per-tile role gating.** The config shape is reusable outright, but PropertyOps should add a `requiredRole`/`requiredCapability` field per tile immediately, since AssetOps's all-or-nothing "whole hub is admin-only" gate would not scale if PropertyOps ends up needing more than one admin-adjacent role.

## 5. AssetOps-Specific Systems to Exclude

- **Freshdesk integration entirely** — the mirror tables, the dual native/mirrored ticket-ID encoding, the sync cron, and every route branch that checks "is this a Freshdesk ticket." PropertyOps has no ticketing vendor to coexist with.
- **Snipe-IT integration entirely** — hardware creation/checkout calls, the `NOT NULL snipe_asset_id` foreign keys on assignment/classification tables, tag-allocation logic that live-queries Snipe, and the entire "load 500 hardware records from Snipe and overlay AssetOps quality flags" cleanup-board pattern.
- **Square Event POS** — payment terminal/reader integration for restaurant event sales has no property-management analog.
- **Restaurant-specific Location Profile fields and assets** — `mphi_number`/`phi_store_number`, `liquor_license`/`liquor_license_type`, `franchise_agreement`, `remodel_package`, `concept`, `main_room_occupancy`/`side_room_occupancy`/`seat_count`, `building_signage`, `counter_type`, and the hardcoded Pizza Hut remodel-standard PDFs and color-palette/signage image assets under `public/location-profile/`.
- **The static 34-store `lib/locations.ts` array** and any Michigan-Pizza-Hut-specific naming baked into it.
- **The single hardcoded kitchen equipment list** (`expectedEquipmentSlots`) — as noted above, only the pattern survives, not the data.
- **`APP_ACCESS_CODE` shared-secret front-door gate** — a single shared passphrase used (inconsistently, and previously insecurely) to gate several admin bootstrap routes and a separate construction-mode form gate. Three legacy routes still use it even after a recent hardening pass. PropertyOps should never introduce this pattern; rely solely on per-user sessions.
- **N8N/MCP's current wiring** — the safety primitives (HMAC webhook signing, hostname allowlisting, timing-safe callback verification) are worth borrowing conceptually if PropertyOps ever adds automation, but the current integration and its Mac-mini-hosted operating model are AssetOps-specific infrastructure.
- **Company Vehicle's hardcoded "Equipment" ticket category** — a small but real coupling to AssetOps's fixed category taxonomy that shouldn't be carried forward literally.

## 6. External Dependencies

| Dependency | Purpose in AssetOps | PropertyOps disposition |
| --- | --- | --- |
| Freshdesk | Ticketing system of record | **Exclude entirely.** PropertyOps must be fully native. |
| Snipe-IT | Asset system of record | **Exclude entirely.** Build a canonical asset model from day one instead. |
| Square | Event POS payment terminal/reader | **Exclude.** No property-management analog. |
| Ecobee SmartBuildings | HVAC/thermostat environment monitoring | Exclude the vendor; the credential-caching/redaction *pattern* is a good template if/when PropertyOps builds its own environment monitoring. |
| Flume | Water usage monitoring | Same disposition as Ecobee. |
| N8N/MCP | Backup alerts, automation glue | Exclude the current wiring; the HMAC/allowlist safety primitives are worth reusing if automation is added later. |
| Resend | Transactional email | **Reuse the foundation pattern with a new account.** Not a code dependency on AssetOps. |
| Vercel Blob | Private file storage | **Reuse the pattern with PropertyOps's own storage account.** Not shared with AssetOps. |
| Neon Postgres | Primary database | **Reuse the driver/connection pattern with PropertyOps's own database.** No data or schema sharing. |

Nothing above requires a runtime dependency on AssetOps; every "reuse" in this table means reusing an approach with entirely separate credentials and accounts.

## 7. Recommended PropertyOps Architecture

A modular Next.js App Router application (or equivalent), structured from day one as route-per-module rather than one shared page component. Proposed modules:

- **Platform core**: session/auth, role+capability model, generic audit log, DB connection layer, environment configuration.
- **Admin shell**: config-driven tool hub with per-tile capability gating, reused from the Admin Hub pattern.
- **Properties**: base property entity + type-specific extension tables, documents/photos, contacts, notes, ownership/lease status.
- **Equipment**: catalog of known equipment types, property-type templates, template-to-catalog mapping, per-property equipment instances, service/lifecycle history.
- **Work Orders**: single native ticket model (no dual-ID encoding), workflow state machine, notes (public/internal), attachments, saved views, and a public token-protected intake form reusing the rate-limit/audit pattern.
- **Assets**: canonical asset entity (family, tag, display name, manufacturer/model/serial/condition/status, assignment type) with assignment history, independent of Work Orders and Equipment but linkable to both.
- **Notifications**: generic type/recipient/payload/deep-link table, category preferences, safe-push-payload policy, Web Push foundation.
- **Files/Documents**: private storage + authorized streaming pattern, shared across all modules.
- **Email**: Resend-based foundation with send-audit table and kill switches.
- **Background jobs**: a single shared, timing-safe cron-auth helper used by every scheduled job from the start.

## 8. Proposed Data Model

At a planning level (no migrations), core entities:

- **Organization** — even if PropertyOps launches single-tenant, every table below should carry an `organization_id` from day one (see Section 10).
- **Property** — base fields (name, address, property_type_id, ownership/lease status, active). Type-specific detail lives in extension tables per property type rather than one wide table.
- **PropertyType** — defines the taxonomy (residential rental, strip mall, freestanding commercial, etc.) and which EquipmentTemplate(s) apply by default.
- **EquipmentTemplate** / **EquipmentTemplateItem** — a template belongs to a property type; items reference the equipment catalog and flag required vs. optional.
- **Equipment** (catalog) — the reusable list of known equipment kinds, independent of any specific property.
- **PropertyEquipment** — an actual equipment instance at a property, with status/condition, linked to its catalog entry and (optionally) an override of the template default.
- **EquipmentServiceRecord** — service/lifecycle history tied to a PropertyEquipment row.
- **WorkOrder** — core ticket fields (subject, description, property_id, category, priority, requester, source). Satellite tables: WorkOrderStatusHistory, WorkOrderNote (public/internal), WorkOrderAttachment, WorkOrderAssetLink.
- **Asset** — canonical asset entity (family, tag, display name, manufacturer/model/serial, condition/status, assignment_type). AssetAssignmentHistory tracks every assignment change.
- **User** — platform account; **Person/Employee** — a broader identity concept than "user," since PropertyOps will likely need to track tenants/contacts who aren't system users.
- **Assignment** — a generic join capturing "this Asset/PropertyEquipment is currently assigned to this Person or Property," with history.
- **Notification** / **NotificationPreference** — generic type/recipient/payload model as described above.
- **Attachment/Document** — generic file metadata row usable by Property, WorkOrder, Equipment, or Asset records via a polymorphic or per-module reference.
- **AuditLog** — one generic table (actor, action, entity_type, entity_id, before/after JSON, timestamp) used everywhere, instead of AssetOps's pattern of reinventing a slightly different history table per feature.

## 9. Infrastructure Separation Plan

- **Vercel**: an entirely separate Vercel project and production deployment; no shared build, no shared cron configuration (cron schedules are declared per-project in `vercel.json` and are not portable).
- **Database**: a separate Neon (or equivalent) Postgres instance with its own connection string; zero shared tables or cross-database queries.
- **Blob/file storage**: a separate Vercel Blob store (or equivalent) with its own read/write token; no shared bucket or path namespace with AssetOps.
- **Environment variables**: a maintained `.env.example` from the first commit (AssetOps has none today despite ~90 distinct env vars, which is a real onboarding cost worth avoiding).
- **Domain**: a separate custom domain, independent of AssetOps's.
- **Authentication**: an entirely separate `users`/`sessions` schema. No user, session, or credential ever shared between the two apps.
- **Secrets**: PropertyOps's own Resend API key, its own cron secret(s), its own Web Push VAPID keypair, its own Blob token, its own database credentials. Nothing copied from AssetOps's environment.
- **Background services**: PropertyOps's own cron routes with their own shared, timing-safe auth helper (see Section 11) — not a shared job runner.

## 10. Security and Future Tenant Isolation

Even if the first release is single-tenant, a few decisions now would preserve an easy path to a packaged, multi-organization product later:

- Add `organization_id` to every core table from the start, even if there's only one organization row for a long time. Retrofitting tenant isolation after the fact is far more expensive than carrying an unused foreign key for a year.
- Build the permission model as a real role/capability table (not boolean columns on the user table), so a future organization can define its own role set without schema changes.
- Keep property types, equipment templates, and branding as configuration data scoped to an organization, not hardcoded constants — this is the direct fix for AssetOps's single-catalog, single-brand assumptions.
- Never introduce a shared-secret "front door" pattern like `APP_ACCESS_CODE`; every authenticated action should resolve to a specific user's session from day one.
- If any future integration needs to persist third-party credentials (rather than caching them in-process the way Ecobee/Flume do today), store them encrypted at rest — AssetOps has explicitly never needed to solve this because its integration tokens are cached in memory only, which is fine for AssetOps's current scale but should be revisited for a packaged product with more integrations.
- Decide early whether background jobs are single-tenant-wide or need to iterate per organization; that distinction is much cheaper to bake in now than to add later.

## 11. Technical Debt Risks (Do Not Carry Forward)

- **The monolithic page component.** `app/page.tsx` is 14,874 lines — roughly 13% of the entire application in one client component. This is the single clearest thing to avoid; PropertyOps should be route/module-structured from commit one.
- **No real migration system.** AssetOps has 126 `CREATE TABLE IF NOT EXISTS` statements across 46 files and 263 `ADD COLUMN IF NOT EXISTS` statements, applied lazily at runtime with no version history and no rollback path. PropertyOps should adopt a real migration tool immediately.
- **No validation layer.** Zero use of `zod` or any schema-validation library anywhere in the codebase; input validation is hand-rolled per route with inconsistent error shapes. Adopt a validation library from the start.
- **Inconsistent auth adoption.** A good shared session-verification helper exists, but roughly 13 files still define their own local, duplicated auth-check functions instead of using it. Enforce the shared helper via convention or lint rule from day one.
- **Non-timing-safe secret comparisons.** Four of five cron routes compare shared secrets with plain `===` rather than a timing-safe comparison, even though a correct timing-safe helper exists elsewhere in the codebase and simply wasn't applied consistently. Build one shared cron-auth helper and use it everywhere.
- **Reinvented audit/history tables.** At least three different ad-hoc history-table shapes exist (event-log style, assignment-history style, ticket-activity style) instead of one generic audit table, plus at least one place where "audit logging" is actually just an unpersisted console log. Design one generic audit table and use it everywhere.
- **No CI, partial test coverage.** 42 unit test files exist (all under `lib/`, testing business rules) but there is no `test` script in `package.json` and no CI workflow of any kind — so the tests that exist aren't enforced. Wire a test runner and CI from the first commit.
- **Env var sprawl with no reference file.** Roughly 90 distinct environment variables are referenced with no `.env.example` or documentation of what's required. Ship a maintained example file from day one.
- **Product name and vendor names baked into internal naming.** "AssetOps" appears over a thousand times across the codebase as a naming prefix, and "Freshdesk" appears in table/column names for logic that has nothing to do with Freshdesk (native ticket workflow tables use a `freshdesk_ticket_id` column even for non-Freshdesk tickets). Choose honest, vendor-neutral names for PropertyOps's own tables from the start.

## 12. Recommended Build Phases

The originally proposed sequence (PROP-1 Platform Foundation, PROP-2 Property Profiles, PROP-3 Equipment Management, PROP-4 Work Orders, PROP-5 Asset Management) is largely sound, but this audit suggests one reordering worth considering: **build a basic, property-scoped Work Order system before the full Equipment template system**, not after. Reasoning: AssetOps's own history shows its ticket system matured and delivered value over many iterations while deep IT asset/equipment management developed on a separate, later track — tickets only ever needed a location to be useful, not a fully-realized equipment model. Equipment templates, meanwhile, are the one area with no existing reference implementation at all (see Section 4) and are likely to need real design iteration with the business (what property types exist, what belongs in each template) before the schema stabilizes. Delivering basic work orders early gives the team a usable product sooner and de-risks the ticket system in parallel with the necessarily slower equipment-template design work; work orders can gain equipment linkage once that module lands, exactly as AssetOps later added asset-linking to its own already-working ticket system.

**PROP-1 — Platform Foundation.** Goal: a working, deployable shell with nothing property-specific yet. Scope: session/auth, role+capability model, generic audit log table, DB connection layer, Admin Hub shell (config-driven, per-tile capability gating), notification core (table + preferences, minimal type set), private file storage pattern, email foundation (Resend + audit + kill switches), one shared timing-safe cron-auth helper, `.env.example`, CI wiring, migration tool selection and initial setup. Dependencies: none. Outcome: an empty but real, testable, deployable application with no business data yet.

**PROP-2 — Property Profiles.** Goal: properties become the first real business entity. Scope: base Property table, PropertyType taxonomy (even if only 2-3 types to start), documents/contacts/notes, photo storage via the PROP-1 file pattern, area-style location scoping generalized to properties. Dependencies: PROP-1. Outcome: users can create, view, and manage property records with proper permission scoping.

**PROP-3 — Work Orders (basic).** Goal: a usable native ticketing system scoped to properties, with no equipment dependency yet. Scope: single native ticket model (no dual-ID complexity), workflow states, notes, attachments, the public token-protected intake pattern, notifications on ticket events. Dependencies: PROP-1, PROP-2. Outcome: staff and (optionally) tenants can submit and track maintenance requests end to end.

**PROP-4 — Equipment Management.** Goal: the genuinely new design work — configurable equipment templates per property type. Scope: equipment catalog, EquipmentTemplate/EquipmentTemplateItem, per-property equipment instances and overrides, service/lifecycle history, and retrofitting equipment links into Work Orders from PROP-3. Dependencies: PROP-1, PROP-2; benefits from PROP-3 existing so linkage can be added rather than designed blind. Outcome: properties have a real, type-aware equipment inventory, and work orders can reference specific equipment.

**PROP-5 — Asset Management.** Goal: a canonical, vendor-independent asset model (inspired by, not copied from, `assetops_assets`) with assignment/history tracking for onboarding and offboarding. Scope: asset catalog, assignment types (person/property/unassigned), assignment history, retirement/disposal. Dependencies: PROP-1, PROP-2; can proceed in parallel with PROP-4 if resourcing allows, since assets and equipment are related but distinct concepts. Outcome: a functioning asset inventory independent of any third-party asset system.

## 13. Open Questions / Decisions Needed

- What is the actual property-type taxonomy for v1 — how many types, and how different are their expected equipment sets? This directly sizes PROP-4.
- Is PropertyOps single-organization for the foreseeable future, or is there a near-term intent to onboard other property-management companies as customers? This affects how much of Section 10's tenant-isolation groundwork is worth doing immediately versus deferring.
- What roles does the business actually need beyond admin/manager/user — is there a "tenant" or "external contact" identity that needs limited, property-scoped visibility (submit a work order, see its status) without being a full staff user?
- Does v1 need any building-environment or utility-monitoring integration (an Ecobee/Flume equivalent), or is that explicitly out of scope until a later phase?
- Is a public, unauthenticated "submit a maintenance request" form (mirroring AssetOps's TICK-9 pattern) needed for tenants/contacts in v1, or is work-order creation staff-only initially?
- What migration tool and hosting/CI stack does the team want to standardize on? This audit recommends adopting a real migration tool and CI from day one but does not prescribe which one.
- Does the business want a distinct "employee/person" identity separate from "system user" in v1 (for asset assignment to people who don't log in), or is that deferred to PROP-5?
- What branding/white-label expectations exist for a future packaged product, and should that shape the Admin Hub/UI theming decisions made in PROP-1?

This audit cannot determine any of the above from inspection alone — they are business decisions, not architectural findings, and are intentionally left open rather than answered by assumption.

## 14. Recommended PROP-1 Scope

PROP-1 should establish, and only establish, the platform foundation with zero property-specific business logic:

**In scope:** a new, separate repository and Vercel project with its own database, Blob store, domain, and full env var set (documented in a real `.env.example`); a chosen migration tool with initial schema setup for `organizations`, `users`, `sessions`, and a role/capability table (not boolean flag columns); a generic `audit_log` table used from the first feature onward; the Admin Hub shell ported from AssetOps's config-driven tile pattern, with per-tile capability gating added from the start; the notification core (table + preferences) with a minimal placeholder type set, ready for real event types later; the private-file-storage pattern (validate → private blob → authorized streaming route); the email foundation (Resend integration, send-audit table, kill-switch health check) with at least one real transactional template (e.g., password reset) to prove it end to end; one shared, timing-safe cron-auth helper, even if only one cron job exists yet; a CI pipeline running lint, type-check, and whatever unit tests exist, wired from the first commit.

**Explicitly deferred:** anything related to Property, PropertyType, Equipment, Work Orders, or Asset entities — those are PROP-2 through PROP-5. Any multi-tenant UI/config beyond the `organization_id` column existing on tables. Any third-party integration (email delivery aside, since that's core platform infrastructure, not a property-management integration). Any building-environment/utility monitoring. Any public unauthenticated intake form (that belongs with Work Orders in PROP-3). Branding/white-label theming beyond whatever is needed to stand the app up with PropertyOps's own name and logo.

The test of a correctly-scoped PROP-1: at the end of it, an admin can log in, see an empty but real Admin Hub, and the team has a deployable, tested, CI-covered application with no business data model yet — a genuinely clean foundation to build Property Profiles on top of in PROP-2, rather than a partial property system with foundation work still tangled into it.