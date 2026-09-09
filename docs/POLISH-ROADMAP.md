# PropertyOps Polish + Workflow Hardening Roadmap

## Status

PropertyOps has completed its major first-pass feature build. The codebase today
implements platform foundation (organizations, users, roles/capabilities, sessions,
audit log, notifications, files, email), Property Profiles (with property types,
contacts, notes), Equipment (catalog, templates, property equipment, service
records), native Work Orders, Preventive Maintenance, Inspections, Compliance
Records, Assets (with People-based assignment/custody), Vendors, Tenants/Leases,
and an Operations Calendar. This matches the sequence recommended in
`docs/PROP-0-PORTABILITY-REPORT.md` Section 12, extended two phases further
(vendors and tenants/leases/calendar) than that report originally scoped.

Note: no individual `PROP-1` through `PROP-10` planning documents exist in
`docs/` today — only `PROP-0-PORTABILITY-REPORT.md`. Phase markers (`PROP-6`,
`PROP-7`, `PROP-9`, `PROP-10`, etc.) appear only as inline code comments in
`src/db/schema.ts` and elsewhere, not as standalone documents. This roadmap and
its per-phase documents are the first durable planning documentation for the
project since PROP-0.

The next phase is **not** another large feature expansion. It is a **polish and
workflow hardening phase**: day-to-day usability, property modeling depth, admin
controls, user personalization, operational safety, and navigation clarity.

## Documents

- `docs/POLISH-1-HOME-BRIEF-PROFILE-NOTIFICATIONS.md`
- `docs/POLISH-2-PROPERTY-COMPANIES-UNITS-TENANTS.md`
- `docs/POLISH-3-PROPERTY-COMPONENTS-PHOTOS-CONTACTS.md`
- `docs/POLISH-4-EXTERNAL-DOCUMENT-LINKS.md`
- `docs/POLISH-5-ADMIN-USERS-ACCESS-EMAIL.md`
- `docs/POLISH-6-PM-DUPLICATE-PROTECTION-WORKFLOW-FIXES.md`
- `docs/POLISH-7-PEOPLE-ASSET-UI-CLEANUP.md`

Each document is self-contained: a future Claude Code build session should be
able to implement its phase independently, without rediscovering scope from this
roadmap or from conversation history.

## Intended Execution Sequence

**POLISH numbers are stable identifiers, not a strict execution order.** The
order below is the intended build sequence, and differs from the numbering:

1. **POLISH-6 — PM Duplicate Work Order Protection + Workflow Fixes** (build first)
2. **POLISH-1 — Home Brief + Profile/Notifications**
3. **POLISH-2 — Property Companies + Units/Suites + Tenant Integration**
4. **POLISH-3 — Property Components + Property Photos + Owner/Landlord Contacts**
5. **POLISH-4 — External Document Links / SharePoint Support**
6. **POLISH-5 — Admin Hub Users/Access + Email**
7. **POLISH-7 — People/Asset UI Cleanup** (build last)

### Why POLISH-6 goes first

PM-generated duplicate Work Orders are a known, currently-reproducible
operational defect (see that document's "Current Observed Problem"). It is a
workflow safety fix to an already-shipped feature, not new surface area, and
carries no dependency on any other polish phase. Fixing it first stops the
defect from compounding while the rest of the roadmap is built out.

### Why POLISH-7 goes last

POLISH-7 changes the prominence of Person/Asset-custodian navigation but must
not touch the underlying data model. Deferring it until the other phases are
understood ensures no other phase (in practice, none of POLISH-1 through
POLISH-5 touches `people`/`asset_assignments`) has grown a hidden dependency on
People remaining a top-level nav item before the UI is de-emphasized.

### Ordering rationale for POLISH-1 through POLISH-5

- **POLISH-1** is placed early because it is the most user-visible improvement
  (home page + profile + notification preferences) and touches no other
  phase's data model — it only reads existing tables (work orders, preventive
  maintenance, inspections, compliance, leases, equipment) and adds new ones
  (a profile projection is just existing `users` fields; notification
  preferences already exist as `notification_preferences`).
- **POLISH-2** (Property Company, Units/Suites, Lease→Unit linkage) is
  foundational data modeling that POLISH-3's Unit-scoped photos and POLISH-4's
  Unit-related external documents can build on, so it precedes both.
- **POLISH-3** (Property Components, Photos, Owner/Landlord Contacts) extends
  the Property Profile and depends on POLISH-2's Unit model existing for
  Unit-scoped photos to be meaningful.
- **POLISH-4** (External Document Links) is independent of POLISH-2/3 in data
  terms but is sequenced after them so the "related entity" list it documents
  (Property, Unit, Lease, Tenant, Vendor, Property Component) reflects the
  entities those phases introduce, rather than needing a later amendment.
- **POLISH-5** (Admin Hub Users/Access + Email) is sequenced after the
  property-model phases because Part A's "property access scoping" question
  is easier to answer once Units/Property Companies exist and it is clear
  whether property-level scoping needs to key on Property, Property Company,
  or both.

## Dependencies Between Phases

| Phase | Depends on | Reason |
| --- | --- | --- |
| POLISH-6 | none | Self-contained fix to existing PM/Work Order code. |
| POLISH-1 | none | Reads existing modules' data; profile/notification prefs are additive to `users`/`notification_preferences`. |
| POLISH-2 | none | New Property Company + Unit/Suite tables, additive FK on `leases`. |
| POLISH-3 | POLISH-2 (for Unit-scoped photos) | Property Photos reference an optional Unit; Property Components do not depend on POLISH-2. |
| POLISH-4 | POLISH-2, POLISH-3 (soft) | External Document "related entity" list is written assuming Units and Property Components already exist as linkable entity types. |
| POLISH-5 | POLISH-2 (soft, for property-access-scoping design) | Whether property access scoping should key on Property or Property Company is clearer once POLISH-2 ships. Email Administration (Part B) has no dependency on any other phase. |
| POLISH-7 | POLISH-3 (must not conflict) | POLISH-3 introduces Property Owner/Landlord Contacts, which must remain conceptually and structurally separate from the Person/Asset-custodian model POLISH-7 de-emphasizes. |

## Global Polish Rules

Every polish build must preserve:

- Standalone PropertyOps architecture — no AssetOps runtime dependency.
- No Freshdesk integration.
- No Snipe-IT integration.
- No Pizza Hut-specific application behavior, terminology, or schema.
- Organization scoping (`organization_id`) on every new core table.
- Centralized authentication/authorization (`getCurrentUserWithCapabilities`, `requireCapability`/`requireAdminCapability`).
- The real role/capability model (`roles` → `role_capabilities` → `capabilities`) — never a new boolean permission column on `users`.
- The generic `audit_log` table for every new mutation — never a bespoke per-feature history table.
- The existing private file foundation (`files` table + Blob + related-entity rules) — never a competing storage subsystem.
- Versioned Drizzle migrations under `drizzle/` — never runtime `CREATE TABLE IF NOT EXISTS` logic.
- The existing validation UX standard (see below).
- Route/module-per-domain structure — never a monolithic page component.
- No unapproved broad refactors.

### Validation UX Standard

- One concise top-level error banner per form.
- Invalid fields highlighted visually.
- No raw Zod or internal error text surfaced to the user.
- No raw API error codes surfaced to the user.
- Short inline explanation only where necessary.

No polish build should begin future unrelated functionality simply because an
extension point becomes visible while working on the current phase. Anything
discovered but out of scope must be written down as a recommendation in the
relevant document, not implemented.
