import { describe, expect, it } from "vitest";

import {
  UNIT_FILTER_ALL,
  UNIT_FILTER_SHARED,
  buildUnitFilterOptions,
  defaultNewRecordUnitId,
  filterEquipmentForUnit,
  formatRecordUnitLabel,
  isUnitFilterUseful,
  matchesUnitFilter,
} from "./unit-display";

const row = (propertyUnitId: string | null, unitLabel: string | null = null, unitIsActive: boolean | null = true) => ({
  propertyUnitId,
  unitLabel,
  unitIsActive,
});

describe("formatRecordUnitLabel", () => {
  it("labels NULL as Property-wide / Shared", () => {
    expect(formatRecordUnitLabel(row(null))).toBe("Property-wide / Shared");
  });

  it("marks a deactivated Unit instead of pretending the record is Shared", () => {
    expect(formatRecordUnitLabel(row("u1", "Fitness Center", false))).toBe("Fitness Center (inactive)");
  });
});

describe("Unit filter", () => {
  it("offers only the Units present in the (already scoped) rows", () => {
    const options = buildUnitFilterOptions([row(null), row("fitness", "Fitness Center")]);
    expect(options.map((option) => option.label)).toEqual(["All", "Property-wide / Shared", "Fitness Center"]);
    expect(options.map((option) => option.label)).not.toContain("Restaurant");
  });

  it("is hidden when it couldn't narrow anything", () => {
    expect(isUnitFilterUseful(buildUnitFilterOptions([row(null), row(null)]))).toBe(false);
    expect(isUnitFilterUseful(buildUnitFilterOptions([row(null), row("fitness", "Fitness Center")]))).toBe(true);
  });

  it("matches All / Shared / a specific Unit", () => {
    expect(matchesUnitFilter(row("fitness"), UNIT_FILTER_ALL)).toBe(true);
    expect(matchesUnitFilter(row(null), UNIT_FILTER_SHARED)).toBe(true);
    expect(matchesUnitFilter(row("fitness"), UNIT_FILTER_SHARED)).toBe(false);
    expect(matchesUnitFilter(row("fitness"), "fitness")).toBe(true);
  });
});

describe("filterEquipmentForUnit", () => {
  const equipment = [
    { id: "treadmill", propertyUnitId: "fitness" },
    { id: "hood", propertyUnitId: "restaurant" },
    { id: "roof", propertyUnitId: null },
  ];

  it("offers Shared + that Unit's Equipment for a Unit-owned record", () => {
    expect(filterEquipmentForUnit(equipment, "fitness").map((e) => e.id)).toEqual(["treadmill", "roof"]);
  });

  it("offers all visible Equipment for a Shared record", () => {
    expect(filterEquipmentForUnit(equipment, null)).toHaveLength(3);
  });
});

describe("defaultNewRecordUnitId", () => {
  it("defaults whole-Property editors to Property-wide / Shared", () => {
    expect(defaultNewRecordUnitId({ units: [{ id: "fitness" }], wholeProperty: true })).toBeNull();
  });

  it("defaults a Unit-restricted editor to their own Unit", () => {
    expect(defaultNewRecordUnitId({ units: [{ id: "fitness" }], wholeProperty: false })).toBe("fitness");
  });
});
