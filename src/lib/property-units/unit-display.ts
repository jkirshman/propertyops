// UNIT-OPS-1: pure display helpers for Unit/Suite ownership, shared by every
// Unit-ownable record (Equipment, Work Orders, Inspections) — lists, detail
// pages, and Unit filters. Generalized from UNIT-EQUIP-1's Equipment helpers.

export const PROPERTY_WIDE_UNIT_LABEL = "Property-wide / Shared";

export interface UnitDisplayFields {
  propertyUnitId: string | null;
  unitLabel: string | null;
  unitIsActive: boolean | null;
}

export function formatRecordUnitLabel(record: UnitDisplayFields): string {
  if (record.propertyUnitId === null) {
    return PROPERTY_WIDE_UNIT_LABEL;
  }
  const label = record.unitLabel ?? "Unit";
  return record.unitIsActive === false ? `${label} (inactive)` : label;
}

export const UNIT_FILTER_ALL = "all";
export const UNIT_FILTER_SHARED = "shared";

export interface UnitFilterOption {
  value: string;
  label: string;
}

/**
 * Filter choices built only from the rows the viewer was actually given —
 * the server has already dropped other Units' records, so a Unit-restricted
 * User can never be offered a Unit they can't access.
 */
export function buildUnitFilterOptions(rows: UnitDisplayFields[]): UnitFilterOption[] {
  const units = new Map<string, string>();
  let hasShared = false;
  for (const row of rows) {
    if (row.propertyUnitId === null) {
      hasShared = true;
    } else if (!units.has(row.propertyUnitId)) {
      units.set(row.propertyUnitId, formatRecordUnitLabel(row));
    }
  }

  const unitOptions = Array.from(units, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );
  return [
    { value: UNIT_FILTER_ALL, label: "All" },
    ...(hasShared ? [{ value: UNIT_FILTER_SHARED, label: PROPERTY_WIDE_UNIT_LABEL }] : []),
    ...unitOptions,
  ];
}

/**
 * A Unit filter is worth showing only when it can actually narrow the list:
 * at least two distinct buckets (Shared + one Unit, or two Units).
 */
export function isUnitFilterUseful(options: UnitFilterOption[]): boolean {
  return options.length > 2;
}

export function matchesUnitFilter(row: { propertyUnitId: string | null }, filter: string): boolean {
  if (filter === UNIT_FILTER_ALL) {
    return true;
  }
  if (filter === UNIT_FILTER_SHARED) {
    return row.propertyUnitId === null;
  }
  return row.propertyUnitId === filter;
}

export interface UnitOption {
  id: string;
  unitLabel: string;
  name: string | null;
}

export function formatUnitOptionLabel(unit: UnitOption): string {
  return unit.name ? `${unit.unitLabel} — ${unit.name}` : unit.unitLabel;
}

/**
 * UNIT-OPS-1: Equipment a Work Order / Inspection on `unitId` may link to —
 * Shared Equipment plus that Unit's own. With Property-wide selected every
 * visible Equipment is offered; picking Unit-owned Equipment then moves the
 * form to that Unit (see reconcileUnitWithEquipment).
 */
export function filterEquipmentForUnit<T extends { propertyUnitId: string | null }>(
  equipment: T[],
  unitId: string | null,
): T[] {
  if (unitId === null) {
    return equipment;
  }
  return equipment.filter((row) => row.propertyUnitId === null || row.propertyUnitId === unitId);
}

/**
 * The Unit a new Work Order / Inspection form starts on. Property-wide for
 * whole-Property editors (the common case); a Unit-restricted editor starts
 * on their first Unit so a report about their own space isn't exposed to
 * every other Unit by default — they can still pick Property-wide.
 */
export function defaultNewRecordUnitId(options: { units: { id: string }[]; wholeProperty: boolean }): string | null {
  if (options.wholeProperty || options.units.length === 0) {
    return null;
  }
  return options.units[0].id;
}
