import { describe, expect, it } from "vitest";

import {
  EQUIPMENT_UNIT_FILTER_ALL,
  EQUIPMENT_UNIT_FILTER_SHARED,
  PROPERTY_WIDE_EQUIPMENT_LABEL,
  buildEquipmentUnitFilterOptions,
  formatEquipmentUnitLabel,
  formatUnitOptionLabel,
  matchesEquipmentUnitFilter,
} from "./unit-display";

const shared = { propertyUnitId: null, unitLabel: null, unitIsActive: null };
const unitA = { propertyUnitId: "unit-a", unitLabel: "Unit A", unitIsActive: true };
const unitB = { propertyUnitId: "unit-b", unitLabel: "Unit B", unitIsActive: true };
const unit10 = { propertyUnitId: "unit-10", unitLabel: "Suite 10", unitIsActive: true };
const unit2 = { propertyUnitId: "unit-2", unitLabel: "Suite 2", unitIsActive: true };

describe("formatEquipmentUnitLabel", () => {
  it("labels NULL-Unit Equipment as Property-wide / Shared", () => {
    expect(formatEquipmentUnitLabel(shared)).toBe(PROPERTY_WIDE_EQUIPMENT_LABEL);
  });

  it("shows the Unit label, and flags an inactive Unit", () => {
    expect(formatEquipmentUnitLabel(unitA)).toBe("Unit A");
    expect(formatEquipmentUnitLabel({ ...unitA, unitIsActive: false })).toBe("Unit A (inactive)");
  });
});

describe("buildEquipmentUnitFilterOptions", () => {
  it("builds All + Shared + each Unit present, sorted naturally", () => {
    expect(buildEquipmentUnitFilterOptions([unit10, shared, unit2, unit2])).toEqual([
      { value: EQUIPMENT_UNIT_FILTER_ALL, label: "All" },
      { value: EQUIPMENT_UNIT_FILTER_SHARED, label: PROPERTY_WIDE_EQUIPMENT_LABEL },
      { value: "unit-2", label: "Suite 2" },
      { value: "unit-10", label: "Suite 10" },
    ]);
  });

  it("never offers a Unit that isn't in the (already access-filtered) rows", () => {
    const values = buildEquipmentUnitFilterOptions([unitA, shared]).map((option) => option.value);
    expect(values).not.toContain("unit-b");
    expect(values).toEqual([EQUIPMENT_UNIT_FILTER_ALL, EQUIPMENT_UNIT_FILTER_SHARED, "unit-a"]);
  });

  it("omits Shared when there is no Shared Equipment", () => {
    expect(buildEquipmentUnitFilterOptions([unitA, unitB]).map((option) => option.value)).toEqual([
      EQUIPMENT_UNIT_FILTER_ALL,
      "unit-a",
      "unit-b",
    ]);
  });
});

describe("matchesEquipmentUnitFilter", () => {
  it("filters by All / Shared / a specific Unit", () => {
    expect(matchesEquipmentUnitFilter(unitA, EQUIPMENT_UNIT_FILTER_ALL)).toBe(true);
    expect(matchesEquipmentUnitFilter(shared, EQUIPMENT_UNIT_FILTER_SHARED)).toBe(true);
    expect(matchesEquipmentUnitFilter(unitA, EQUIPMENT_UNIT_FILTER_SHARED)).toBe(false);
    expect(matchesEquipmentUnitFilter(unitA, "unit-a")).toBe(true);
    expect(matchesEquipmentUnitFilter(unitB, "unit-a")).toBe(false);
  });
});

describe("formatUnitOptionLabel", () => {
  it("appends the Unit name when present", () => {
    expect(formatUnitOptionLabel({ id: "u", unitLabel: "Unit A", name: "Coffee shop" })).toBe("Unit A — Coffee shop");
    expect(formatUnitOptionLabel({ id: "u", unitLabel: "Unit A", name: null })).toBe("Unit A");
  });
});
