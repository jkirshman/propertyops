# POLISH-7 — People / Asset-Custodian UI Cleanup

## 1. Objective

Remove unnecessary prominence from the People section in primary navigation,
since PropertyOps does not currently need Asset Custodian management as a
major operational workflow, while preserving all underlying Person/assignment
data and functionality for backward compatibility and continued Asset use.

## 2. Why This Phase Exists

The `people` model and its Asset-assignment relationship were carried over
from an Asset Management build that anticipated custodian/employee-assignment
workflows as a significant standalone concern. In practice, current
PropertyOps usage does not need a major top-level People workflow — Assets
are still assigned to people, but that is a secondary action within Asset
management, not a destination staff navigate to on its own. Keeping "People"
as a first-level nav item (`AppHeader`'s `showPeopleLink`) overstates its
importance relative to how the product is actually used today.

## 3. Current-State Observations

- `people` (`src/db/schema.ts:429`): `firstName`, `lastName`, `displayName`,
  `email`, `phone`, `referenceNumber`, `isActive`, `linkedUserId` (optional,
  explicit-only link to a `users` row — never automatic, per the schema's own
  comment). This is a lightweight identity model, not a full HR/contact
  system.
- `assets.assignedPersonId`, `assets.assignmentType`, and the
  `asset_assignments` immutable history table
  (`src/db/schema.ts:455-524`) are the real operational dependency on
  `people` — every Asset assignment/transfer/return workflow reads and writes
  through `people`.
- Navigation: `AppHeader` (`src/components/shell/AppHeader.tsx`) renders
  "People" as a top-level nav link (`showPeopleLink`), the same visual
  weight as Properties, Work Orders, Assets, etc. Routes exist at
  `/people`, `/people/[id]`, `/people/new`
  (`src/app/(app)/people/*`), backed by `src/lib/people/people.ts` and
  components `PeopleListPanel` (and likely others under
  `src/components/people/` and `src/components/assets/` —
  `AssetAssignmentPanel`, `AssetAssignmentHistoryPanel` already reference
  People for the assignment UI within Assets).
- No capability constants file for People was separately inspected in this
  audit pass; implementation should confirm whether a `PEOPLE_CAPABILITIES`
  set (view/create/edit) already exists in `src/lib/people/constants.ts` and
  reuse it unchanged — this phase does not add or remove capabilities, only
  relocates/de-emphasizes navigation.
- This model must not be confused with three other, entirely separate
  contact-like concepts already in the product: Property Owner/Landlord
  Contacts (`property_contacts`, extended by POLISH-3), Tenant Contacts
  (`tenant_contacts`), and Vendor Contacts (`vendor_contacts`) — none of
  these reference or derive from `people` today, and this phase must keep it
  that way.

## 4. Required Behavior

- **Decided: do not rename** People to "Asset Custodians" as a newly
  prominent module — the brief is explicit that this is a de-emphasis, not a
  rebrand-and-promote.
- **Remove or de-emphasize** People from primary navigation
  (`AppHeader`'s top-level nav). Decided shape: remove the standalone
  top-level "People" `NavLink` from `AppHeader` entirely, rather than
  visually shrinking it — a de-emphasized-but-still-top-level item still
  competes for the same attention this phase is trying to reduce.
- **Retain** all underlying `people` data, routes, and Asset-assignment
  functionality. This phase is a navigation/placement change, not a data or
  feature removal:
  - `/people`, `/people/[id]`, `/people/new` routes continue to exist and
    function (for direct navigation/linking, and for anyone who bookmarked
    them) — they are simply no longer advertised in top-level nav.
  - Asset assignment to a Person, transfer, and assignment history continue
    to work exactly as today from within the Assets module
    (`AssetAssignmentPanel`, `AssetAssignmentHistoryPanel`) — these
    components already live under `src/components/assets/`, so they require
    **no change** for this requirement; the dependency the brief warns about
    ("keep Asset assignment functionality working") is already structurally
    isolated from the nav change.
- **Relocate discoverability**: place Person/custodian management access
  closer to the Assets context, since that's the only place it's actually
  used. Decided: add a link to `/people` **from within the Assets section**
  (e.g. an "Manage People" or "Custodians" link on the Assets list page or
  Assets section sub-navigation, if the Assets section has its own
  sub-navigation to attach to; otherwise a clearly-placed link on the Assets
  list page itself), so a user who needs to add a new person (before
  assigning them an asset) doesn't have to type the URL directly, but does
  have to be in the Assets context to find it — which is the point.
- **Do not delete** any `people` row, `asset_assignments` row, or the
  `people`/`asset_assignments` schema, merely because top-level navigation is
  removed. No migration is expected or wanted for this phase.

## 5. Data/Model Implications

None. This is a UI/navigation-only phase. No schema change, no new table, no
column change to `people`, `assets`, or `asset_assignments`.

## 6. UI/UX Expectations

- `AppHeader`: remove the `showPeopleLink` top-level nav item (and its
  corresponding prop threading from whatever server component computes
  `showPeopleLink` today based on capability — that capability check moves
  to gating the new in-context link instead, not removed).
- Assets list page (or Assets section navigation, if one exists beyond the
  top-level nav item): add a clearly-labeled, secondary-prominence link to
  `/people` (e.g. in a page-level toolbar or an "Assets" sub-menu, not styled
  to compete with the primary Assets actions like "New Asset").
- The People list/detail pages themselves (`/people`, `/people/[id]`,
  `/people/new`) are **not** restyled or restructured by this phase — only
  their entry point changes.
- No change to the Asset Assignment UI/flow itself (assign/transfer/return),
  since it already lives correctly within the Assets module.

## 7. Authorization/Capability Considerations

- No capability changes. Whatever capability currently gates `showPeopleLink`
  in `AppHeader` (likely a People-view capability, or, if none exists
  distinctly, `ASSET_CAPABILITIES.VIEW` reused) should gate the new
  in-Assets-context link identically — this phase relocates the entry point,
  it does not change who is allowed to reach it.
- The `/people`, `/people/[id]`, `/people/new` routes retain whatever
  capability checks they already enforce server-side, unchanged.

## 8. Notifications/Email Considerations

None. This phase makes no notification-related change. (Existing
`ASSET_ASSIGNED` notifications, if they reference a Person, are unaffected.)

## 9. Audit Requirements

None new. No mutation is introduced by this phase — it is a pure navigation/
placement change with no new create/edit/delete action to audit.

## 10. Migration Considerations

None. No schema change.

## 11. Backward Compatibility

- Every existing `people` row, `asset_assignments` row, and their
  relationships to `assets`/`users` remain fully intact and queryable.
- Direct links/bookmarks to `/people`, `/people/[id]`, `/people/new`
  continue to work.
- Any existing integration or internal link from an Asset detail page to a
  Person detail page continues to work unchanged.

## 12. Explicit Out-of-Scope Items

- Deleting any `people` or `asset_assignments` data or schema.
- Renaming People to "Asset Custodians" as a promoted module.
- Any change to the Asset assignment/transfer/return workflow itself.
- Any change to Property Owner/Landlord Contacts, Tenant Contacts, or Vendor
  Contacts — these remain entirely separate from the Person model, as they
  are today, and this phase does not touch them (Property Owner/Landlord
  Contacts are POLISH-3's concern; Tenant Contacts remain under Tenants;
  Vendor Contacts remain under Vendors; Users remain under Admin/User
  management per POLISH-5).
- Any change to `PEOPLE_CAPABILITIES` or the introduction of new capabilities.

## 13. Dependencies

Depends on POLISH-3 having shipped (or being understood) only in the sense
that POLISH-3 introduces Property Owner/Landlord Contacts and this phase must
confirm, before removing People from top-level nav, that no part of POLISH-3
mistakenly built on or referenced the `people` table for property-side
contacts (it should not have — POLISH-3 extends `property_contacts`, an
entirely separate table). This is a verification dependency, not a
build-order requirement in the schema/migration sense.

## 14. Acceptance Criteria

- `AppHeader` no longer shows a top-level "People" nav link.
- A working link to `/people` exists from within the Assets section, gated
  by the same capability that previously gated the top-level link.
- `/people`, `/people/[id]`, `/people/new` continue to function identically
  to before this phase.
- Asset assignment, transfer, and assignment-history views continue to
  function identically to before this phase.
- No `people` or `asset_assignments` data is deleted or altered.

## 15. Manual Verification Checklist

1. Load the app as a user who previously saw "People" in top nav; confirm it
   no longer appears there.
2. Navigate to the Assets section; confirm a link to People/Custodians is
   present and reachable.
3. Follow that link; confirm `/people` loads and lists existing People
   records correctly.
4. Open an existing Person's detail page directly by URL; confirm it still
   loads correctly.
5. Assign an Asset to a Person via the existing Asset Assignment flow;
   confirm it still works end to end, including assignment history.
6. Confirm a user without People-view capability sees neither the removed
   top-level link nor the new in-Assets link.

## 16. Open Questions

None. The brief's decision (de-emphasize, don't delete or rebrand) is
explicit enough to implement directly.
