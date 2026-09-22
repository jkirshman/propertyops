# UNIT-EQUIP-1 — Equipment Unit/Suite Ownership

## 1. Objective

Let Property Equipment optionally belong to one Unit/Suite of its Property, so
a User with Unit-scoped access (e.g. Marquette Strip Mall → Unit A) sees Unit
A's Equipment plus the Property's shared Equipment, but not Units B/C/D's.
Admins, Managers, and whole-Property Users keep seeing everything at the
Property.

## 2. Data Model

- `property_equipment.property_unit_id` (nullable FK → `property_units`,
  `ON DELETE NO ACTION`) plus the index `property_equipment_property_unit_idx
  (property_id, property_unit_id)`.
- `NULL` = Property-wide / Shared. Every existing row migrates as `NULL`, and
  nothing tries to infer ownership from names or notes.
- Equipment still belongs to exactly one Property; the Unit must be in the same
  organization and the same Property.
- Migration: `drizzle/0017_unit_equip_1_equipment_unit_ownership.sql`
  (additive: one column, one FK, one index).

## 3. The Visibility Rule (one implementation)

`src/lib/equipment/equipment-access.ts`, built on ACCESS-1's `PropertyScope`:

| Scope | Shared Equipment | Own Unit's Equipment | Other Units' Equipment |
| --- | --- | --- | --- |
| Admin (`properties.access.unrestricted`) | ✓ | ✓ | ✓ |
| Whole-Property access row (Manager, or User) | ✓ | ✓ | ✓ |
| Unit-restricted User (one or more Units) | ✓ | ✓ | ✗ |
| No access row | ✗ | ✗ | ✗ |

- `canAccessPropertyEquipment` / `filterAccessibleEquipment`: record and list checks.
- `resolveHiddenEquipmentIds`: ids of Equipment in the user's Properties
  that belong to Units they can't access. Records that only *reference*
  Equipment use it. It runs no query unless the user has Unit-only access
  somewhere.
- `resolveEquipmentUnitAssignment`: server-side validation of a Unit
  assignment (see §5).

The rule follows access rows, not role names. A Manager given only a Unit row
is Unit-restricted like anyone else.

## 4. Enforcement Points

| Surface | Behavior for a Unit-restricted User |
| --- | --- |
| Property → Equipment tab / `GET /api/properties/[id]/equipment` | Other Units' Equipment is removed. This list also feeds every Work Order, PM, and Inspection Equipment selector. |
| Equipment detail page and `GET/PATCH /api/property-equipment/[id]` | 404, the same as another Property's Equipment. |
| Equipment activity, photos, and service-record routes | 404 |
| Equipment documents and photo images (`/api/files*`, external documents) | 404, via `related-entity-rules` (Unit-owned Equipment gets the Unit-aware check) |
| Property Photos aggregate gallery; photo PATCH | Hidden Equipment's photos are dropped / 404 |
| Home App Brief: "Equipment needing attention" | Filtered |
| Vendor → Service History | Filtered by Equipment visibility (this route previously had no Property scoping at all) |
| Expected vs. actual | Withheld (`restricted: true`). Its counts would reveal other Units' Equipment. |
| PM plans for hidden Equipment | Hidden everywhere: list, detail, edit, occurrences, generate, Home brief, Calendar |
| Work Orders and Inspections linked to hidden Equipment | Still visible, since they stay Property-scoped as before. The Equipment link is redacted (`propertyEquipmentId: null`, `propertyEquipmentRestricted: true`) and can't be changed by that user. *Superseded by UNIT-OPS-1: Work Orders and Inspections now have their own Unit and are hidden entirely when it's another Unit; the redaction remains only for legacy Shared records.* |
| `?propertyEquipmentId=` / `?equipmentId=` on WO, PM, and Inspection lists and new pages | Hidden Equipment returns an empty result or is ignored |
| Linking Equipment on WO/PM/Inspection create or update | Only visible Equipment can be linked (`invalid_equipment`) |
| `GET /api/files` with no entity filter | Now requires `files.manage`. It listed every file's metadata org-wide to any signed-in user. |

## 5. Assigning a Unit

- The selector appears only when the Property type has `supports_units`, and
  only for users with `equipment.create`/`equipment.edit`. View-only Users
  stay view-only.
- The default is Property-wide / Shared. Options are the active Units the
  editor can access.
- The server rejects: a Unit on a type without Units (`units_not_supported`);
  a nonexistent, cross-Property, cross-org, or inactive Unit (`invalid_unit`);
  and a Unit the editor can't access (403).
- Moving Equipment into or out of Property-wide requires whole-Property
  access, so a Unit-restricted editor can't expose their Equipment to other
  Units or claim Shared Equipment.

## 6. Unit Lifecycle

- Units are soft-deactivated only (no delete route). Equipment on a
  deactivated Unit keeps that Unit ("Unit A (inactive)"), is never moved to
  Property-wide, and stays fully manageable. Saving other fields never moves it.
- `ON DELETE NO ACTION`: a direct Unit delete is refused while Equipment
  references the Unit, but deleting a Property still cascades both in one
  statement. `RESTRICT` would break that cascade.

## 7. Audit

`property_equipment.unit_changed` records `{ propertyUnitId, unitLabel }`
before and after. It covers assigning a Unit, moving between Units,
Unit → Property-wide, and Property-wide → Unit. `propertyUnitId` is left out of
the generic `property_equipment.update` event, so nothing is logged twice.
Create is covered by the existing `property_equipment.create` event, whose
`after` payload now includes `propertyUnitId`.
