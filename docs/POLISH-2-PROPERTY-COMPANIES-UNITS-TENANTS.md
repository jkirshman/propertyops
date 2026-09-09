# POLISH-2 — Property Companies + Units/Suites + Tenant Integration

## 1. Objective

Improve the Property ownership and multi-tenant model: add a first-class,
configurable Property Company (ownership entity) concept, add a first-class
Property Unit/Suite model for multi-tenant properties, and extend Leases to
optionally reference a specific Unit — without breaking any existing Property
or Lease record.

## 2. Why This Phase Exists

Today, `properties` has no ownership-entity reference at all — there is no
`property_company_id` or free-text ownership-company field in the schema.
`leases` has a single free-text `unitLabel` column and a direct
`propertyId` reference, with no way to represent a specific, manageable Unit
record that multiple leases (over time) can be tied to, and no way to filter
Properties by ownership entity. As LAW Asset Group's portfolio grows to
include multiple ownership entities and more multi-tenant strip-mall
properties, both gaps become real operational friction: there is no reliable
way to answer "which properties does entity X own" or "which unit is this
lease actually for, as a manageable record."

## 3. Current-State Observations

- `properties` (`src/db/schema.ts:222`): no ownership-entity column of any
  kind exists today — this is genuinely new surface area, not a migration of
  an existing free-text field.
- `property_types` (seeded in `scripts/seed.ts`) includes exactly four types
  today: `residential-rental`, `strip-mall-multi-tenant-commercial`,
  `freestanding-commercial`, `leased-property`. Only
  `strip-mall-multi-tenant-commercial` is a natural fit for a multi-unit
  workflow; the others are implicitly single-unit.
- `leases` (`src/db/schema.ts:1006`) already has: `propertyId` (required,
  cascade), `tenantId` (required, restrict), `unitLabel` (nullable free
  text), `squareFootageLeased` (nullable integer). There is no
  `property_unit_id` and no `property_units` table.
- The inline schema comment on `leases` explicitly documents intent: "The
  relationship between Tenant and Property — a Property never carries a
  tenant reference directly, and a Tenant may have multiple leases... across
  one or more properties." This phase must preserve that invariant exactly —
  it does not change who owns the Tenant↔Property relationship.
- Properties list/filter capability
  (`src/lib/properties/properties.ts`, `src/app/(app)/properties`) currently
  filters by whatever fields the list query supports today (property type,
  status, etc. — the exact current filter set should be re-verified against
  `listProperties`/the properties list page at implementation time, since it
  may have grown since this document was written); there is no Property
  Company filter today because the concept doesn't exist.
- `PROPERTY_CAPABILITIES` (`src/lib/properties/constants.ts`) currently has:
  `VIEW`, `CREATE`, `EDIT`, `MANAGE_CONTACTS`, `MANAGE_NOTES`,
  `MANAGE_DOCUMENTS`. No capability exists yet for managing a Property
  Company taxonomy (same shape gap as e.g. `PROPERTY_TYPE_CAPABILITIES`,
  `VENDOR_CATEGORY_CAPABILITIES` — this phase should follow that exact
  existing pattern for a new taxonomy).

## 4. Required Behavior

### Property Company

- A new, org-scoped, configurable **Property Company** entity (name,
  active/inactive, at minimum), managed the same way `property_types`,
  `vendor_categories`, `asset_categories`, etc. already are (an
  Admin Hub tile + `/admin/property-companies` CRUD page +
  `/api/property-companies` route), not a free-text field on `properties`.
- Decided: **do not** use free-text ownership-company text as the long-term
  source of truth. A Property Company is a first-class, dropdown-selectable
  record.
- `properties` gains `propertyCompanyId` (nullable FK to
  `property_companies.id`, `onDelete: "set null"`, since no existing data
  populates it and no property currently has any ownership-entity value to
  preserve). **Decided: nullable, not required** — many properties may not
  yet have an assigned Property Company at rollout, and requiring it would
  block editing/creating unrelated property fields on properties whose
  ownership entity hasn't been sorted out yet. A future phase may tighten
  this to required once portfolio data is complete; that tightening is
  explicitly not part of this phase.
- Selectable by dropdown under Property Identity (alongside Property Type) on
  the property create/edit form.
- Properties list gains a Property Company filter, alongside the existing
  Property Type and Status filters (and whatever other filters already exist
  at implementation time — re-verify, do not assume this document's filter
  list is exhaustive).

### Units / Suites

- A new, org-scoped, **`property_units`** table. Fields:
  - `propertyId` (required FK, cascade)
  - `unitLabel` (required text — e.g. "Suite 100", "Unit A", "Space 4")
  - `name` (nullable text — optional descriptive name)
  - `squareFootage` (nullable integer)
  - `isActive` (boolean, default true)
  - `notes` (nullable text)
  - `occupancyState` — **derived, not stored**: computed at read time from
    whether the unit has a currently-active Lease (see below), not written to
    the table. This keeps occupancy always correct without a background job
    to keep a stored flag in sync.
- Decided: **do not** build a floor-plan or space-management engine. This is a
  flat, per-property list of Unit records with the fields above — no spatial
  layout, no nested sub-spaces.
- For properties whose `propertyTypeId` resolves to
  `strip-mall-multi-tenant-commercial` (or any future property type flagged
  the same way — see Section 5), the Property Profile gains a Units/Suites
  panel: a workflow to create/edit/deactivate Unit records for that property.
- Decided: **do not** rely solely on a single integer "number of units" count
  when individual units are required for tenant/lease assignment. If a
  "number of units" convenience field is added to speed up initial Unit
  creation (e.g. "create N units named Suite 1..N"), it must be a
  one-time creation helper, not a stored field that substitutes for the real
  `property_units` records.

### Tenant / Lease Integration

- `leases` gains `propertyUnitId` (nullable FK to `property_units.id`,
  `onDelete: "set null"`). The existing `propertyId` column on `leases` is
  **preserved unchanged** — a Lease always references its Property directly,
  regardless of whether it also references a Unit. This avoids ever having to
  join through `property_units` just to answer "which property is this lease
  for," and matches the existing invariant that a Property never carries a
  tenant reference directly.
- Resulting relationship:
  - For unit-bearing properties: `Tenant → Lease → Property Unit → Property`
    (via `leases.propertyUnitId` and `leases.propertyId`, both populated).
  - For properties without units: `Tenant → Lease → Property` (via
    `leases.propertyId` only, `propertyUnitId` left null) — unchanged from
    today.
- The existing `leases.unitLabel` free-text column is **preserved as-is** and
  remains valid for every existing lease. It is not removed, renamed, or
  backfilled automatically by this phase. See Section 10/11 for the
  migration/compatibility strategy.
- Decided: **do not** duplicate Tenant records per Unit or per Property — a
  Tenant remains one record regardless of how many Units/Properties it has
  leases against, exactly as today.
- Decided: **do not** put a `tenant_id` directly on `properties` or
  `property_units` as a source of truth. Current occupancy of a Unit is
  always derived by querying for an active Lease referencing that
  `propertyUnitId`, never stored redundantly.

## 5. Data/Model Implications

New tables (additive, no changes to existing table shapes beyond two new
nullable FK columns):

- `property_companies`: `id`, `organizationId`, `name`, `isActive`,
  `createdAt`, `updatedAt` — same shape as `vendor_categories`/`asset_categories`
  minus `slug`/`sortOrder` unless implementation finds a concrete need for
  slug-based lookup (unlike categories, Property Companies are referenced only
  by FK, never by slug in a URL, so `slug` is not required by this phase).
- `property_units`: as specified in Section 4, with a unique-ish constraint
  recommended (not required) on `(propertyId, unitLabel)` to avoid accidental
  duplicate unit labels on the same property — implementation should add this
  as a `uniqueIndex` unless it discovers a real reason existing data would
  violate it (unlikely, since the table is new).

Additive columns on existing tables:

- `properties.propertyCompanyId` — nullable FK, `onDelete: "set null"`.
- `leases.propertyUnitId` — nullable FK, `onDelete: "set null"`.

**Property type → "supports units" flag.** Rather than hardcoding the slug
`strip-mall-multi-tenant-commercial` in application logic to decide whether a
property type supports Units, add a boolean column,
`propertyTypes.supportsUnits` (default `false`, seeded `true` for
Strip Mall / Multi-Tenant Commercial). This keeps the behavior data-driven and
consistent with `property_types` already being a configurable, org-scoped
taxonomy rather than a hardcoded enum — a future property type (e.g. a
different multi-tenant configuration) can opt in without a code change.

No data backfill is required or attempted: existing `properties` rows get
`propertyCompanyId = null`; existing `leases` rows get `propertyUnitId = null`
and keep their existing `unitLabel` text untouched.

## 6. UI/UX Expectations

- Property create/edit form: Property Company dropdown placed under "Property
  Identity" (next to Property Type), optional, with a clear "not assigned"
  default state rather than forcing a selection.
- Properties list: Property Company added as a filter control alongside
  existing Property Type/Status filters, following the existing filter UI
  pattern on that page.
- Property Profile (for unit-supporting property types only): a new "Units /
  Suites" tab or panel (following the existing `PropertyProfileTabs` pattern),
  listing units with label, name, square footage, active state, and derived
  occupancy (e.g. "Occupied — Acme Corp" or "Vacant"), with create/edit/
  deactivate actions.
- Lease create/edit form: when the selected Property supports units, a Unit
  dropdown appears (scoped to that property's active units), populated
  alongside (not replacing) the existing free-text `unitLabel` field. Decided:
  keep both fields visible during this phase rather than hiding `unitLabel`
  once a Unit is selected — this avoids confusing users editing older leases
  that only have `unitLabel` set. A future phase may revisit hiding
  `unitLabel` once enough leases have been linked to real Units.
- Follows the existing validation UX standard (top-level banner, highlighted
  fields, no raw Zod/API error text).

## 7. Authorization/Capability Considerations

New capabilities, following the existing `<domain>.<action>` and
`<domain>_type.manage`-style naming conventions already used for taxonomies:

- `PROPERTY_COMPANY_CAPABILITIES.VIEW` = `property_company.view`
- `PROPERTY_COMPANY_CAPABILITIES.MANAGE` = `property_company.manage`
  (Admin Hub CRUD, matching `PROPERTY_TYPE_CAPABILITIES` exactly.)
- `PROPERTY_UNIT_CAPABILITIES`:
  - `VIEW` = `property_unit.view`
  - `CREATE` = `property_unit.create`
  - `EDIT` = `property_unit.edit`

  Units are managed from within the Property Profile, not a separate Admin
  Hub taxonomy, so they follow the `property.*`-style capability shape (view/
  create/edit) rather than the `*_type.manage` taxonomy shape. Decided: reuse
  the existing `PROPERTY_CAPABILITIES.EDIT` as a fallback gate is **not**
  sufficient on its own if a role should be able to manage units without full
  property-edit rights (e.g. a leasing coordinator) — hence the distinct
  capability set. Whether the seeded roles grant `property_unit.*` alongside
  `property.edit` by default is a role-seeding decision made at
  implementation time, not an architectural one.
- No new capability is required to reference a Unit from a Lease — this uses
  the existing `LEASE_CAPABILITIES.CREATE`/`EDIT`.
- Property Company selection on a Property uses the existing
  `PROPERTY_CAPABILITIES.EDIT` (it's a field on the Property record, not a
  separate managed sub-resource).

## 8. Notifications/Email Considerations

None required. This phase introduces no new event types. (A future phase
could notify on "unit became vacant/occupied," but that is not requested
here and is explicitly out of scope — see Section 12.)

## 9. Audit Requirements

- Property Company CRUD: audited via the existing generic `audit_log` pattern
  used by other taxonomies (`entityType: "property_company"`).
- Property Unit CRUD: audited the same way
  (`entityType: "property_unit"`, `entityId` = unit id, with `propertyId` in
  the before/after payload for traceability).
- A Property's `propertyCompanyId` change and a Lease's `propertyUnitId`
  change are captured by the existing property/lease update audit paths (both
  `properties` and `leases` already go through update functions that should
  already record before/after diffs — verify at implementation time that the
  new columns are included in whatever diffing mechanism those update paths
  use, e.g. `stripUndefined`/`diffFields`).

## 10. Migration Considerations

Four additive Drizzle migrations (order matters only insofar as FK targets
must exist first):

1. Create `property_companies`.
2. Add `properties.propertyCompanyId` (nullable FK to `property_companies`).
3. Add `propertyTypes.supportsUnits` (boolean, default `false`), then a
   data-only follow-up (not a schema migration) setting it `true` for the
   seeded Strip Mall / Multi-Tenant Commercial property type.
4. Create `property_units`; add `leases.propertyUnitId` (nullable FK to
   `property_units`).

No migration touches or rewrites any existing row's existing columns. No
`NOT NULL` constraint is added to any existing column.

## 11. Backward Compatibility

- Every existing `properties` row continues to load, display, and save with
  `propertyCompanyId = null` — the properties list, filters, and forms must
  treat "no Property Company assigned" as a normal, expected, filterable
  state (e.g. an explicit "Unassigned" filter option), not an error state.
- Every existing `leases` row continues to load, display, and save with
  `propertyUnitId = null` and its original `unitLabel` text intact and
  displayed exactly as before. **Decided: no automatic matching of
  `unitLabel` text to `property_units` records.** The brief explicitly warns
  against unsafe automatic matching (e.g. fuzzy string matching "Suite 100"
  against a newly-created Unit named "Suite 100" is exactly the kind of
  unsafe inference to avoid, since a false match silently reassigns lease
  history to the wrong physical unit). A future phase may build a
  **manual, staff-reviewed** linking tool (surface leases with a
  `unitLabel` but no `propertyUnitId`, alongside the property's real
  `property_units`, and let a human confirm each link) — that tool is not
  part of this phase and must not be implemented as an automatic background
  job.
- Existing Property Type behavior (equipment template resolution, inspection
  template scoping) is untouched; `supportsUnits` is a new, independent flag
  read only by the Units UI/workflow.

## 12. Explicit Out-of-Scope Items

- A floor-plan or visual space-management engine.
- Automatic/fuzzy matching of `leases.unitLabel` to `property_units` records.
- Making `properties.propertyCompanyId` required.
- Hiding or removing `leases.unitLabel` from the UI.
- Notifications for unit occupancy changes.
- Multi-tenant SaaS "Property Company as a customer organization" concepts —
  Property Company here is purely an ownership-entity taxonomy within a
  single PropertyOps organization, not a step toward multi-organization
  tenancy (that remains governed by the existing `organizations` table and
  is unrelated).
- Any change to how Tenant records are created/deduplicated.

## 13. Dependencies

None required from other phases. POLISH-3 (Property Photos, Unit-scoped) and
POLISH-4 (External Document Links referencing Units) both build on this
phase's `property_units` table, so this phase should ship before those two,
per the roadmap.

## 14. Acceptance Criteria

- A Property Company can be created, edited, deactivated via Admin Hub, and
  selected on a Property's Identity section via dropdown.
- The Properties list can be filtered by Property Company, in addition to
  existing filters, and an "Unassigned" option correctly returns properties
  with `propertyCompanyId = null`.
- A property whose type has `supportsUnits = true` shows a Units/Suites panel
  on its Property Profile; a property whose type does not shows no such
  panel.
- Units can be created/edited/deactivated on a supporting property, with
  correctly derived occupancy state based on active leases.
- A Lease for a unit-supporting property can optionally select a Unit; the
  Lease record correctly stores both `propertyId` and `propertyUnitId`.
- A Lease for a non-unit-supporting property has no Unit dropdown and
  `propertyUnitId` remains null.
- Every pre-existing Lease continues to display its original `unitLabel` text
  unchanged, with `propertyUnitId = null`, and can still be edited and saved
  without being forced to select a Unit.
- Every pre-existing Property continues to display and save correctly with
  `propertyCompanyId = null`.

## 15. Manual Verification Checklist

1. Create two Property Companies; assign one to an existing Property; confirm
   it displays correctly and the Properties list filter returns it correctly
   under that company and correctly excludes it when filtering by the other
   company.
2. Confirm filtering by "Unassigned" Property Company returns properties with
   no company set, including properties that existed before this phase.
3. On a Strip Mall / Multi-Tenant Commercial property, create 3 Units with
   varying square footage; confirm they list correctly and each shows
   "Vacant" with no active lease.
4. Create a Lease against one of those Units; confirm the Unit now shows
   occupied with the correct Tenant name, and the Lease record shows both
   Property and Unit correctly.
5. Open an existing (pre-migration) Lease with only `unitLabel` text set;
   confirm it still displays and saves correctly, with no forced Unit
   selection and no data loss.
6. Confirm a Residential Rental property (a type with `supportsUnits = false`)
   shows no Units/Suites panel.
7. Confirm role-based gating: a user without `property_unit.create` cannot
   create a Unit even if they can view the Property.

## 16. Open Questions

None — the brief resolves the key product decisions (nullable Property
Company, no auto-matching, unit model shape, `leases.propertyId` preserved)
explicitly enough to proceed without further business input.
