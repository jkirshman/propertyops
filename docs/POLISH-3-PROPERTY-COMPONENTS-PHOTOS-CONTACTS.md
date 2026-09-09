# POLISH-3 — Property Components + Property Photos + Owner/Landlord Contacts

## 1. Objective

Extend Property Profiles with three additions: a first-class Property
Component model for physical building/site features that are neither
Equipment nor movable Assets; a Photos area reusing the existing private file
foundation; and explicit Owner/Landlord/Property Manager/Asset Manager/
Emergency Contact roles on the existing Property Contacts model.

## 2. Why This Phase Exists

PropertyOps already distinguishes Equipment (operationally attached, with
condition/service/replacement lifecycle) from Assets (organization-owned,
movable, custody-tracked). Neither concept fits a roof, a parking lot, or
landscaping — physical, non-movable, non-"equipment" features of a site that
still need condition tracking and occasional service history. Separately,
Property Profiles today have no dedicated visual record (no photo area) and
no explicit, role-typed ownership-side contact model beyond a generic
"contact type" field — a Property Profile should be able to answer "who owns/
manages this property, and who do I call?" at a glance.

## 3. Current-State Observations

- No `property_components` (or similarly named) table exists. Equipment
  (`property_equipment`) is scoped to `equipmentCatalogItemId` (a required FK
  into `equipment_catalog_items`), which is the wrong shape for a roof or
  parking lot — forcing a catalog-item model onto site features would misuse
  the Equipment module's template/catalog machinery (`equipment_templates`,
  `equipment_template_items`) that exists specifically to support Equipment's
  expected-vs-actual reconciliation, which Property Components do not need.
- `files` (`src/db/schema.ts:177`) is already a generic,
  polymorphic-by-convention table: `relatedEntityType` + `relatedEntityId` +
  Blob storage, with per-entity-type capability gating in
  `src/lib/files/related-entity-rules.ts`
  (`RELATED_ENTITY_FILE_RULES`). Property already has a registered entity
  type, `PROPERTY_FILES_ENTITY_TYPE = "property"`
  (`src/lib/properties/constants.ts`), gated by
  `PROPERTY_CAPABILITIES.VIEW` / `MANAGE_DOCUMENTS`. There is **no existing
  photo-specific concept** (category, caption, cover-photo flag) layered on
  top of `files` — today `files` is a flat, undifferentiated attachment list
  per entity.
- `property_contacts` (`src/db/schema.ts:258`) already has: `name`,
  `contactType`, `company`, `email`, `phone`, `notes`, `isPrimary`,
  `isActive`. `CONTACT_TYPES`
  (`src/lib/properties/constants.ts`) is currently:
  `tenant`, `owner`, `landlord`, `property_manager`, `emergency`, `utility`,
  `other`. **`owner`, `landlord`, `property_manager`, and `emergency` already
  exist** — only **`asset_manager`** is missing from the required role list
  in the brief ("Owner, Landlord Contact, Property Manager, Asset Manager,
  Emergency Contact"). The existing model also has no `title`/`mobilePhone`
  distinct from `phone` (compare to `tenant_contacts`, which already has both
  `phone` and `mobilePhone`, and `title`) — `property_contacts` is missing
  those two fields relative to its sibling contact tables.
- Because `property_contacts` already supports the required role set (minus
  one value) with the required fields (minus two), **this phase extends the
  existing table rather than creating a competing contacts system** — this
  matches the brief's own instruction to evaluate existing Property Contacts
  first and reuse if it fits cleanly, which it does.
- `equipment_service_records` already models the "service history tied to a
  physical thing" shape this phase needs for Components; it is reusable as a
  **pattern**, but Property Components need their own service-history table
  (or a generalized one) since `equipment_service_records.propertyEquipmentId`
  is a required FK specifically into `property_equipment`.

## 4. Required Behavior

### Property Components

- A new, org- and property-scoped **Property Component** entity, distinct
  from both Equipment and Assets, for physical site/building features:
  roof, parking lot, sidewalk, landscaping, exterior lighting, building
  envelope, gutters/drainage, signage, dumpster enclosure, fencing, loading
  area, other.
- Decided: **component type is a fixed, seeded vocabulary** (matching the
  brief's example list, plus "Other"), managed the same way
  `EQUIPMENT_CONDITIONS`/`EQUIPMENT_STATUSES` are — a TypeScript constant, not
  a per-organization configurable taxonomy table like `property_types`. This
  list is short, unlikely to need per-org customization, and keeping it a
  constant avoids an unnecessary Admin Hub tile for a phase explicitly scoped
  to be "operational, not engineering-grade facility lifecycle modeling."
- Fields: property (required FK), component type (required, from the fixed
  vocabulary, with an `other` value plus a free-text label when `other` is
  chosen), description/name (optional), installation/replacement date
  (optional), condition (required, reusing the existing
  `good`/`fair`/`poor`/`unknown` vocabulary from
  `src/lib/equipment/constants.ts` for consistency across the app rather than
  inventing a second condition scale), expected useful life (optional,
  informational text or year count — not a scheduling engine), warranty
  information (optional text), vendor/contractor (optional FK to `vendors`,
  matching the existing additive `vendorId` pattern already used on
  `equipment_service_records`), notes (optional).
- Documents and photos: reuse the existing `files` foundation via a new
  registered entity type (`property_component`), exactly as every other module
  does — no new storage subsystem.
- Service/history: a new `property_component_service_records` table, matching
  the shape of `equipment_service_records` (service date, service type,
  summary, vendor, cost, notes) but scoped to `propertyComponentId` instead of
  `propertyEquipmentId`. Decided: **do not** attempt to generalize
  `equipment_service_records` into a shared polymorphic service-history table
  in this phase — that is a larger refactor than this phase's scope and would
  touch the Equipment module unnecessarily; a parallel, component-scoped table
  is the additive, lower-risk choice.
- Work Order linkage: `work_orders` gains an optional
  `propertyComponentId` FK (nullable, `onDelete: "set null"`), following the
  exact existing pattern of `workOrders.propertyEquipmentId` and
  `workOrders.assetId` — a Work Order may reference at most the entity types
  it's actually about; this phase does not change the "one primary linkage"
  convention already established (a Work Order can already optionally
  reference Equipment, an Asset, and a Vendor simultaneously, so adding
  Property Component alongside them is consistent, not a new pattern).
- Preventive Maintenance linkage: `preventive_maintenance_plans` gains an
  optional `propertyComponentId` FK (nullable, `onDelete: "set null"`),
  mirroring the existing `propertyEquipmentId` column exactly. Decided: in
  scope, since it's a one-column additive mirror of an already-proven
  pattern ("where cleanly supportable," per the brief, and this is).
- Decided: keep the first implementation **operational** — no
  engineering-grade lifecycle modeling (no depreciation schedules, no
  automated replacement-date alerting beyond what POLISH-1's Home Brief might
  later choose to add, no warranty-claim workflow).

### Property Photos

- A Photos area on the Property Profile, reusing `files` + Blob exactly as
  today — **no competing file-storage subsystem**.
- Photo categories (fixed vocabulary, mirroring `CONTACT_TYPES`'s pattern):
  `exterior`, `interior`, `site`, `unit_suite`, `other`.
- Decided additions, all in scope per the brief's "consider support for" list:
  - **Caption** — free text.
  - **Category** — from the fixed vocabulary above.
  - **Uploaded date** — reuse `files.createdAt`; no new column needed.
  - **Optional Unit reference** — nullable `propertyUnitId` on the photo
    record, populated only for properties with Units (see POLISH-2); a photo
    with `category = unit_suite` should, where practical, prompt for a Unit
    but is not required to have one (a unit-suite-category photo taken before
    Units existed, or of a still-vacant/unassigned space, is valid without
    one).
  - **Primary/cover Property photo** — exactly one photo per Property may be
    flagged as the cover photo; setting a new cover photo unsets the previous
    one (application-logic invariant, not a DB constraint, matching how
    similar single-flag invariants are handled elsewhere in the codebase,
    e.g. property contacts' `isPrimary` is not DB-enforced-unique either).
- Because a Photo is richer than a generic `files` row (category, caption,
  cover flag, optional unit), **decided**: add a new `property_photos` table
  that itself references a `files` row (`fileId`, FK to `files.id`), rather
  than overloading the generic `files` table with photo-only columns that
  every other module's attachments would carry unused. This keeps `files`
  generic and keeps photo-specific metadata scoped to Property Photos only.
  Upload flow: create the `files` row via the existing private-upload
  pattern, then create the `property_photos` row pointing at it.
- Property Photo UX should make the Property Profile visually recognizable:
  the cover photo (if set) displays prominently on the Property list/detail
  header; this phase does not require a full photo-gallery lightbox
  component if one doesn't already exist elsewhere to reuse, but the photo
  grid must be usable (thumbnails, category filter, caption visible on
  hover/click).

### Owner / Landlord Contacts

- **Extend `property_contacts`**, do not create a new contacts table.
- Add `assetManager` to `CONTACT_TYPES` (the one missing role from the
  brief's required list — `owner`, `landlord`, `property_manager`, and
  `emergency` already exist).
- Add two columns to `property_contacts` to match its sibling tables
  (`tenant_contacts`, `vendor_contacts`, both of which already have these):
  `title` (nullable text) and `mobilePhone` (nullable text, alongside the
  existing `phone`).
- Keep Property Contacts conceptually and structurally separate from:
  Tenant Contacts (`tenant_contacts`, unchanged), Vendor Contacts
  (`vendor_contacts`, unchanged), and PropertyOps Users (`users`, unchanged).
  This phase does not merge or cross-link any of those tables.

## 5. Data/Model Implications

New tables:

- `property_components`: `id`, `organizationId`, `propertyId` (FK, cascade),
  `componentType` (text, from fixed vocabulary), `otherTypeLabel` (nullable
  text, used only when `componentType = 'other'`), `name`/`description`
  (nullable text), `installedDate`/`replacementDate` (nullable date, mirroring
  `property_equipment.installedDate`'s date-only convention), `condition`
  (text, default `unknown`, reusing `EQUIPMENT_CONDITIONS` values), `expected
  UsefulLife` (nullable text or integer years — implementation's choice,
  informational only), `warrantyInfo` (nullable text), `vendorId` (nullable
  FK to `vendors`, `onDelete: "set null"`), `notes` (nullable text),
  `isActive` (boolean, default true), `createdAt`, `updatedAt`.
- `property_component_service_records`: mirrors
  `equipment_service_records` exactly, scoped to `propertyComponentId`
  instead of `propertyEquipmentId`.
- `property_photos`: `id`, `organizationId`, `propertyId` (FK, cascade),
  `fileId` (FK to `files.id`, cascade), `category` (text, from fixed
  vocabulary), `caption` (nullable text), `propertyUnitId` (nullable FK to
  `property_units.id`, `onDelete: "set null"` — requires POLISH-2 to have
  shipped), `isCover` (boolean, default false), `createdAt`.

Additive columns:

- `property_contacts.assetManager` is **not** a column — `assetManager` is a
  new **value** in the existing `contactType` text column's application-level
  vocabulary (`CONTACT_TYPES`), requiring no schema change, only a constants
  update.
- `property_contacts.title` (nullable text) — new column.
- `property_contacts.mobilePhone` (nullable text) — new column.
- `work_orders.propertyComponentId` (nullable FK to `property_components`,
  `onDelete: "set null"`).
- `preventive_maintenance_plans.propertyComponentId` (nullable FK to
  `property_components`, `onDelete: "set null"`).

New `files`-related-entity-type registration:
`PROPERTY_COMPONENT_FILES_ENTITY_TYPE = "property_component"`, added to
`RELATED_ENTITY_FILE_RULES` with view/manage capabilities gated the same way
every other entry is.

## 6. UI/UX Expectations

- Property Profile gains two new tabs/panels, following the existing
  `PropertyProfileTabs` pattern: "Components" and "Photos" (contacts already
  has a home on the profile — this phase extends its form, not its
  placement).
- Components tab: list view (type, name, condition, last service date) +
  detail view (all fields, service history list, linked Work Orders,
  documents/photos for that component via the registered `files` entity
  type).
- Photos tab: category-filterable grid, upload with category + optional
  caption + optional Unit selector (only shown for unit-supporting
  properties), one-click "set as cover photo" action.
- Contacts form: role dropdown gains "Asset Manager"; form gains Title and
  Mobile Phone fields alongside existing Name/Company/Email/Phone/Notes/
  Primary/Active.
- Follows the existing validation UX standard throughout.

## 7. Authorization/Capability Considerations

New capabilities, following the existing `<domain>.<action>` pattern:

- `PROPERTY_COMPONENT_CAPABILITIES`:
  `VIEW` = `property_component.view`,
  `CREATE` = `property_component.create`,
  `EDIT` = `property_component.edit`,
  `MANAGE_SERVICE` = `property_component.manage_service` (mirrors
  `EQUIPMENT_CAPABILITIES.MANAGE_SERVICE` exactly),
  `MANAGE_DOCUMENTS` = `property_component.manage_documents` (registered in
  `RELATED_ENTITY_FILE_RULES`).
- Property Photos use the **existing** `PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS`
  for upload/delete and `PROPERTY_CAPABILITIES.VIEW` for viewing — a photo is
  a specialized Property document, not a separately-permissioned resource, so
  no new capability is introduced for Photos specifically.
- Property Contacts continue to use the existing
  `PROPERTY_CAPABILITIES.MANAGE_CONTACTS` — adding a contact type value and
  two fields does not change the capability surface.

## 8. Notifications/Email Considerations

None required by this phase. (A future phase could notify on component
condition changing to `poor`, mirroring the existing
`EQUIPMENT_CONDITION_POOR` notification type — explicitly out of scope here;
see Section 12.)

## 9. Audit Requirements

- Property Component CRUD and service records: audited via `audit_log`
  (`entityType: "property_component"` / `"property_component_service_record"`),
  matching the existing Equipment audit pattern.
- Property Photo upload/delete/cover-flag changes: audited via `audit_log`
  (`entityType: "property_photo"`), consistent with how other file
  attachments are (or, if file attachment mutations are not currently
  individually audited beyond the generic `files` row's own timestamps,
  Property Photos should still get an explicit audit entry for the
  cover-photo change specifically, since that's a meaningful state change
  beyond a plain upload).
- Property Contact additions (Asset Manager type, Title, Mobile Phone) flow
  through the existing property-contact update audit path unchanged.

## 10. Migration Considerations

Additive migrations, in dependency order:

1. Add `title`, `mobilePhone` to `property_contacts`.
2. Create `property_components`.
3. Create `property_component_service_records`.
4. Add `propertyComponentId` to `work_orders`.
5. Add `propertyComponentId` to `preventive_maintenance_plans`.
6. Create `property_photos` (depends on POLISH-2's `property_units` if the
   `propertyUnitId` column is included — if POLISH-2 has not yet shipped when
   this phase is implemented, ship `property_photos` without that column and
   add it as its own additive migration once POLISH-2 lands, rather than
   blocking Photos on Units).

No existing column is altered, renamed, or made required.

## 11. Backward Compatibility

- Every existing `property_contacts` row continues to work unchanged with
  `title`/`mobilePhone` simply null.
- No existing Equipment, Work Order, or Preventive Maintenance record is
  affected — the new `propertyComponentId` columns are nullable and
  default-null everywhere.
- The existing `files`/Blob foundation and its capability-gating map are
  extended, not modified, for existing entity types.

## 12. Explicit Out-of-Scope Items

- Engineering-grade facility lifecycle modeling (depreciation schedules,
  automated replacement forecasting).
- Notifications for component condition changes.
- A full photo-gallery/lightbox component beyond a usable grid, unless one
  already exists in the codebase to reuse.
- Generalizing `equipment_service_records` into a shared polymorphic service-
  history table.
- Any per-organization configurability of the component-type or
  photo-category vocabularies (both are fixed constants in this phase).
- Merging or cross-linking Property Contacts with Tenant Contacts, Vendor
  Contacts, or Users.

## 13. Dependencies

- Property Photos' optional Unit reference depends on POLISH-2's
  `property_units` table. Property Components, Property Contacts extension,
  and Photos' core functionality (without the Unit reference) have no
  dependency on POLISH-2 and may proceed independently if sequencing changes.

## 14. Acceptance Criteria

- A Property Component can be created with any fixed component type
  (including "Other" with a free-text label), condition, and optional
  vendor/warranty/useful-life fields; it lists and displays correctly on the
  Property Profile.
- A Property Component can have service records added, and can be linked from
  a Work Order and from a Preventive Maintenance plan.
- Photos can be uploaded to a Property with a category and optional caption;
  exactly one photo can be marked as cover, and setting a new cover unsets
  the prior one.
- Property Contacts can be created with role "Asset Manager"; existing
  contacts display correctly with blank Title/Mobile Phone.
- All new capabilities correctly gate their respective actions; a user
  without `property_component.create` cannot create a component even with
  `property.edit`.

## 15. Manual Verification Checklist

1. Add a Roof component to a property with condition "Fair," an installed
   date, and a linked vendor; confirm it displays correctly.
2. Add a service record to that component; confirm it appears in the
   component's history.
3. Create a Work Order linked to that component; confirm the linkage displays
   on both the Work Order and the component.
4. Upload three photos to a property across different categories; mark one
   as cover; confirm the Property list/detail header shows the cover photo.
5. Upload a fourth photo, mark it cover; confirm the previous cover photo is
   automatically unset.
6. On a unit-supporting property, upload a photo with category "Unit/Suite"
   and select a specific Unit; confirm the Unit reference displays correctly.
7. Add a Property Contact with role "Asset Manager," a Title, and a Mobile
   Phone; confirm all fields save and display.
8. Confirm an existing (pre-migration) Property Contact still displays
   correctly with no Title/Mobile Phone shown as an error state.
9. Confirm capability gating: a view-only user cannot create components,
   upload photos, or add contacts.

## 16. Open Questions

None — the component-type and photo-category vocabularies are specified
directly from the brief's examples, and the contacts/photos/components
modeling decisions are resolved above.
