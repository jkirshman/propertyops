// UNIT-EQUIP-1: Equipment names for the shared Unit/Suite display helpers
// (lib/property-units/unit-display.ts, generalized in UNIT-OPS-1).

export {
  PROPERTY_WIDE_UNIT_LABEL as PROPERTY_WIDE_EQUIPMENT_LABEL,
  formatRecordUnitLabel as formatEquipmentUnitLabel,
  UNIT_FILTER_ALL as EQUIPMENT_UNIT_FILTER_ALL,
  UNIT_FILTER_SHARED as EQUIPMENT_UNIT_FILTER_SHARED,
  buildUnitFilterOptions as buildEquipmentUnitFilterOptions,
  matchesUnitFilter as matchesEquipmentUnitFilter,
  formatUnitOptionLabel,
} from "@/lib/property-units/unit-display";
export type {
  UnitDisplayFields as EquipmentUnitDisplayFields,
  UnitFilterOption as EquipmentUnitFilterOption,
  UnitOption as EquipmentUnitOption,
} from "@/lib/property-units/unit-display";
