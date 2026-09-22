import { describe, expect, it } from "vitest";

import {
  canAccessProperty,
  canAccessPropertyUnit,
  isPropertyScopeUnrestricted,
  listAccessiblePropertyIds,
  listAccessibleUnitIdsForProperty,
  type PropertyScope,
} from "./property-access";

const ALL: PropertyScope = { kind: "all" };
const NO_ACCESS: PropertyScope = { kind: "scoped", access: [] };
const WHOLE_PROPERTY_A: PropertyScope = { kind: "scoped", access: [{ propertyId: "A", propertyUnitId: null }] };
const UNIT_1_OF_A: PropertyScope = { kind: "scoped", access: [{ propertyId: "A", propertyUnitId: "unit-1" }] };
const MULTI: PropertyScope = {
  kind: "scoped",
  access: [
    { propertyId: "A", propertyUnitId: null },
    { propertyId: "B", propertyUnitId: "unit-2" },
  ],
};

describe("canAccessProperty", () => {
  it("is always true for an unrestricted scope", () => {
    expect(canAccessProperty(ALL, "anything")).toBe(true);
  });

  it("fails closed for a scoped user with no access rows", () => {
    expect(canAccessProperty(NO_ACCESS, "A")).toBe(false);
  });

  it("allows a property explicitly granted, whole-property or unit-restricted", () => {
    expect(canAccessProperty(WHOLE_PROPERTY_A, "A")).toBe(true);
    expect(canAccessProperty(UNIT_1_OF_A, "A")).toBe(true);
  });

  it("denies a property not in the access list", () => {
    expect(canAccessProperty(WHOLE_PROPERTY_A, "B")).toBe(false);
  });
});

describe("canAccessPropertyUnit", () => {
  it("is always true for an unrestricted scope", () => {
    expect(canAccessPropertyUnit(ALL, "A", "unit-9")).toBe(true);
  });

  it("a whole-property row grants every unit within it", () => {
    expect(canAccessPropertyUnit(WHOLE_PROPERTY_A, "A", "unit-1")).toBe(true);
    expect(canAccessPropertyUnit(WHOLE_PROPERTY_A, "A", "unit-2")).toBe(true);
    expect(canAccessPropertyUnit(WHOLE_PROPERTY_A, "A", null)).toBe(true);
  });

  it("a unit-restricted row only grants its own unit — cross-unit access is denied", () => {
    expect(canAccessPropertyUnit(UNIT_1_OF_A, "A", "unit-1")).toBe(true);
    expect(canAccessPropertyUnit(UNIT_1_OF_A, "A", "unit-2")).toBe(false);
  });

  it("a property-wide (null-unit) record is visible to a unit-restricted user who can access the property", () => {
    expect(canAccessPropertyUnit(UNIT_1_OF_A, "A", null)).toBe(true);
  });

  it("denies a property not in the access list regardless of unit", () => {
    expect(canAccessPropertyUnit(UNIT_1_OF_A, "B", "unit-1")).toBe(false);
  });
});

describe("listAccessiblePropertyIds", () => {
  it("returns null for an unrestricted scope (no filter needed)", () => {
    expect(listAccessiblePropertyIds(ALL)).toBeNull();
  });

  it("returns an empty array for a scoped user with no access rows", () => {
    expect(listAccessiblePropertyIds(NO_ACCESS)).toEqual([]);
  });

  it("dedupes property ids across multiple access rows for the same property", () => {
    const scope: PropertyScope = {
      kind: "scoped",
      access: [
        { propertyId: "A", propertyUnitId: "unit-1" },
        { propertyId: "A", propertyUnitId: "unit-2" },
      ],
    };
    expect(listAccessiblePropertyIds(scope)).toEqual(["A"]);
  });

  it("lists every distinct property across rows", () => {
    expect(listAccessiblePropertyIds(MULTI)?.sort()).toEqual(["A", "B"]);
  });
});

describe("listAccessibleUnitIdsForProperty", () => {
  it("returns null for an unrestricted scope", () => {
    expect(listAccessibleUnitIdsForProperty(ALL, "A")).toBeNull();
  });

  it("returns an empty array when the property itself isn't accessible", () => {
    expect(listAccessibleUnitIdsForProperty(MULTI, "C")).toEqual([]);
  });

  it("returns null when a whole-property row exists for it", () => {
    expect(listAccessibleUnitIdsForProperty(WHOLE_PROPERTY_A, "A")).toBeNull();
  });

  it("returns only the specific unit ids when unit-restricted", () => {
    expect(listAccessibleUnitIdsForProperty(MULTI, "B")).toEqual(["unit-2"]);
  });
});

describe("isPropertyScopeUnrestricted", () => {
  it("distinguishes 'all' from any scoped access", () => {
    expect(isPropertyScopeUnrestricted(ALL)).toBe(true);
    expect(isPropertyScopeUnrestricted(NO_ACCESS)).toBe(false);
  });
});
