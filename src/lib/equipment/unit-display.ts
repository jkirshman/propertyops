// UNIT-EQUIP-1: pure display helpers for Equipment Unit/Suite ownership,
// shared by the Property Equipment list and the Equipment detail page.

export const PROPERTY_WIDE_EQUIPMENT_LABEL = "Property-wide / Shared";

export interface EquipmentUnitDisplayFields {
  propertyUnitId: string | null;
  unitLabel: string | null;
  unitIsActive: boolean | null;
}

export function formatEquipmentUnitLabel(equipment: EquipmentUnitDisplayFields): string {
  if (equipment.propertyUnitId === null) {
    return PROPERTY_WIDE_EQUIPMENT_LABEL;
  }
  const label = equipment.unitLabel ?? "Unit";
  return equipment.unitIsActive === false ? `${label} (inactive)` : label;
}

export const EQUIPMENT_UNIT_FILTER_ALL = "all";
export const EQUIPMENT_UNIT_FILTER_SHARED = "shared";

export interface EquipmentUnitFilterOption {
  value: string;
  label: string;
}

/**
 * Filter choices built only from the Equipment rows the viewer was actually
 * given — the server has already dropped other Units' Equipment, so a
 * Unit-restricted User can never be offered a Unit they can't access.
 */
export function buildEquipmentUnitFilterOptions(rows: EquipmentUnitDisplayFields[]): EquipmentUnitFilterOption[] {
  const units = new Map<string, string>();
  let hasShared = false;
  for (const row of rows) {
    if (row.propertyUnitId === null) {
      hasShared = true;
    } else if (!units.has(row.propertyUnitId)) {
      units.set(row.propertyUnitId, formatEquipmentUnitLabel(row));
    }
  }

  const unitOptions = Array.from(units, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );
  return [
    { value: EQUIPMENT_UNIT_FILTER_ALL, label: "All" },
    ...(hasShared ? [{ value: EQUIPMENT_UNIT_FILTER_SHARED, label: PROPERTY_WIDE_EQUIPMENT_LABEL }] : []),
    ...unitOptions,
  ];
}

export function matchesEquipmentUnitFilter(row: { propertyUnitId: string | null }, filter: string): boolean {
  if (filter === EQUIPMENT_UNIT_FILTER_ALL) {
    return true;
  }
  if (filter === EQUIPMENT_UNIT_FILTER_SHARED) {
    return row.propertyUnitId === null;
  }
  return row.propertyUnitId === filter;
}

export interface EquipmentUnitOption {
  id: string;
  unitLabel: string;
  name: string | null;
}

export function formatUnitOptionLabel(unit: EquipmentUnitOption): string {
  return unit.name ? `${unit.unitLabel} — ${unit.name}` : unit.unitLabel;
}
