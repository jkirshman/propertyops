# UNIT-OPS-1 — Work Order & Inspection Unit/Suite Ownership

## 1. Objective

Let Work Orders and Inspections optionally belong to one Unit/Suite of their
Property, using the same access model UNIT-EQUIP-1 built for Equipment. At
St. Joe (Fitness Center + Restaurant), a User assigned only to Fitness Center
sees Fitness Center and Property-wide records, but never the Restaurant's.
Admins and whole-Property access see everything. The phase also resolves the
Lease NULL-unit inconsistency found during UNIT-EQUIP-1.

## 2. Data Model

- `work_orders.property_unit_id` and `inspections.property_unit_id`: nullable
  FK → `property_units`, `ON DELETE NO ACTION` (same reasoning as
  `property_equipment`: a Unit with records can't be deleted directly, but a
  Property delete still cascades everything in one statement).
- Indexes: `work_orders_property_unit_idx` and `inspections_property_unit_idx`,
  both `(property_id, property_unit_id)`.
- **Inspection architecture.** The `inspections` row *is* the
  scheduled/run instance. There is no separate schedule or
  template-assignment record, so Unit ownership lives there. Templates stay
  Unit-agnostic and reusable: one "General Facility Inspection" template can
  be run for Fitness Center, Restaurant, or the whole Property.
- Existing rows migrate as `NULL` (Property-wide / Shared). Nothing infers a
  Unit from subjects, notes, Equipment names, tenants, or templates.
- Migration: `drizzle/0018_unit_ops_1_work_order_inspection_unit_ownership.sql`
  (additive: two columns, two FKs, two indexes). Apply with `npm run db:migrate`.

## 3. NULL / Shared Semantics (all Unit-ownable records)

`property_unit_id IS NULL` means **Property-wide / Shared**. Anyone with
access to any part of the Property can see it, Unit-restricted users included.
This now holds for Equipment, Work Orders, Inspections, and Leases, and
every check goes through `canAccessPropertyUnit`.

| Scope | Shared | Own Unit(s) | Other Units |
| --- | --- | --- | --- |
| Admin (`properties.access.unrestricted`) | ✓ | ✓ | ✓ |
| Whole-Property access row (Manager or User) | ✓ | ✓ | ✓ |
| Unit-restricted (one or more Unit rows) | ✓ | ✓ | ✗ |
| No access row | ✗ | ✗ | ✗ |

The rule follows access rows, not role names. A Manager given only a Unit
row is Unit-restricted.

## 4. Central Helpers

- `lib/work-orders/work-order-access.ts`: `canAccessWorkOrder`,
  `filterAccessibleWorkOrders`, `getAccessibleWorkOrder` (null = 404),
  `redactHiddenOccurrenceWorkOrder`.
- `lib/inspections/inspection-access.ts`: `canAccessInspection`,
  `filterAccessibleInspections`, `getAccessibleInspection`.
- `lib/property-units/unit-assignment.ts` (pure): `resolveUnitAssignment` (the
  single assignment rule; Equipment's `resolveEquipmentUnitAssignment` now
  delegates to it), `reconcileUnitWithEquipment`,
  `deriveGeneratedWorkOrderUnitId`, `listAssignableUnits`.
- `lib/property-units/record-units.ts`: `resolveRecordUnit` (lookups + both
  rules, used by every Work Order and Inspection create/update) and
  `getRecordUnitOptions`.
- `lib/property-units/unit-display.ts` (pure, client-safe): labels, filters,
  Equipment-for-Unit narrowing, and the form default. The Equipment display
  helpers are now aliases of these.
- `lib/auth/property-access.ts`: `selectRecipientsWithPropertyUnitAccess`
  (pure), `filterUserIdsWithPropertyUnitAccess`, `canUserAccessPropertyUnit`,
  and `listUserIdsWithCapabilityForProperty(…, propertyUnitId)`.

## 5. Enforcement Points

| Surface | Unit-restricted User |
| --- | --- |
| `GET /api/work-orders` (global list, Property tab, Equipment/Asset/Vendor/Lease panels, search, every filter) | Other Units' Work Orders are dropped |
| Work Order detail page, `GET/PATCH /api/work-orders/[id]`, notes, activity | 404 |
| `GET /api/inspections` (global list, Property tab, Equipment panel) | Other Units' Inspections are dropped |
| Inspection detail page, `GET/PATCH`, responses, response PATCH, complete, convert-to-Work-Order, activity | 404 |
| Work Order attachments (`/api/files*`, external documents) | 404 through `related-entity-rules`, which now resolves the Work Order's Unit |
| Home App Brief (overdue/urgent WOs, due Inspections) | Filtered before counting |
| Operations Calendar (WO and Inspection events) | Filtered before projecting, so no titles or counts leak. PM filtering from UNIT-EQUIP-1 is unchanged. |
| PM plan occurrences list | A linked Work Order in another Unit is redacted (id, number, status) |
| Unit selector (`GET /api/properties/[id]/unit-options`) | Only the caller's own active Units |
| List Unit filters | Built from rows the server already scoped, so only accessible Units appear |

Legacy Shared records that still reference another Unit's Equipment stay
visible, and UNIT-EQUIP-1's Equipment-link redaction still applies to them.

## 6. Assigning a Unit (Work Orders and Inspections)

- The selector appears only when the Property type has `supports_units`.
  Otherwise the server rejects any Unit (`units_not_supported`).
- The server rejects a nonexistent, cross-Property, cross-org, or inactive
  Unit (`invalid_unit`), and returns 403 for a Unit the editor can't access.
- **Create:** anyone with Property access may create a Property-wide record,
  since any occupant can report a shared problem. The form defaults to
  Property-wide for whole-Property editors. A Unit-restricted editor defaults
  to their first Unit, so a report about their own space isn't exposed to other
  Units by default; they can still pick Property-wide. *(This deviates from
  "default Shared" for Unit-restricted users only, as a deliberate privacy
  default.)*
- **Update:** moving between accessible Units is allowed. Moving into or out
  of Property-wide requires whole-Property access, as with Equipment.
- Changing the Unit requires `work_order.edit` / `inspection.edit`.
- Unit-restricted Equipment creation keeps UNIT-EQUIP-1's stricter rule:
  creating Shared Equipment requires whole-Property access.

## 7. Equipment Consistency

Enforced by `reconcileUnitWithEquipment` whenever the Unit or the Equipment
link changes:

| Equipment | Record Unit | Result |
| --- | --- | --- |
| Unit A | Unit A | Allowed |
| Unit A | Not specified | The record adopts Unit A |
| Shared or none | Shared or any Unit | Allowed (e.g. a shared main leaking inside one Unit) |
| Unit A | Unit B | Rejected: `equipment_unit_mismatch` (400) |
| Unit A | Explicitly Shared | Rejected: `equipment_unit_mismatch` (400) |

**UX:** selecting Unit-owned Equipment switches the form to that Unit and
locks the Unit selector ("Set by the selected equipment's Unit/Suite").
Choosing a Unit narrows the Equipment list to Shared + that Unit's Equipment.
On a detail page, relinking to Unit-owned Equipment moves the record to that
Unit, subject to the assignment rule.

## 8. Generated Work Orders

- **PM:** a generated Work Order takes its Equipment's Unit. Shared or no
  Equipment stays Shared, since PM plans have no Unit of their own. Duplicate
  protection is unchanged.
- **Inspection finding:** the generated Work Order takes the linked
  Equipment's Unit, or else the Inspection's Unit. Shared stays Shared. A
  client-sent `propertyUnitId` is ignored. If the derived Unit isn't
  accessible to the caller, the request returns 403. That can only happen on a
  legacy Shared Inspection linked to another Unit's Equipment.
- Both follow the source record even if its Unit has since been deactivated.

## 9. Notifications

Every Work Order and Inspection notification recipient is now checked with
`canAccessPropertyUnit` against the record's current Property and Unit:
assignee (create/assign/schedule), requester (resolved/closed), inspector
(scheduled/rescheduled), PM default assignee (generated/completed), and
Inspection "completed with findings". The findings notification previously
went to every `inspection.edit` user **org-wide**. It now goes only to editors
who can access that Property and Unit. Capability requirements are otherwise
unchanged.

## 10. Leases (ACCESS-1 inconsistency fix)

Before this phase, the list (`buildLeaseScopeCondition`) hid NULL-unit Leases
from Unit-restricted users, while detail, activity, edit, and documents
(`canAccessPropertyUnit(…, null)`) allowed them. A Lease could be missing from
the list yet reachable by URL.

**Chosen rule:** a NULL-unit Lease is Property-wide / Shared, visible to
anyone with access to the Property. The list condition now matches
`property_unit_id = <their unit> OR property_unit_id IS NULL`. Tenant
visibility, which derives from Leases, follows the same rule.
`related-entity-rules` lost its `isUnitScopedEntity` special case: every
entity resolves its Unit and one check applies.

## 11. Unit Lifecycle

Units are soft-deactivated only. Work Orders and Inspections on a
deactivated Unit keep it, display as "Unit (inactive)", are never moved to
Shared, and remain readable and editable. Saving other fields never moves them.
New assignments to an inactive Unit are rejected.

## 12. Audit

- `work_order.unit_changed` and `inspection.unit_changed` record
  `{ propertyUnitId, unitLabel }` before and after. They cover Shared → Unit,
  Unit → Shared, and Unit A → Unit B, including a move implied by linking
  Unit-owned Equipment.
- `propertyUnitId` is kept out of `work_order.update` / `inspection.update`,
  so nothing is logged twice. Creates are covered by the existing `*.create`
  events, whose payloads include `propertyUnitId`.
- Activity feeds are per record and inherit the record's 404. Property
  activity only lists Property-entity events.
