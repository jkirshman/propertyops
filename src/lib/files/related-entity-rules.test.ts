import { describe, expect, it } from "vitest";

import type { PropertyScope } from "@/lib/auth/property-access";

import { canAccessRelatedEntityPropertyContext, getRelatedEntityFileRules } from "./related-entity-rules";

describe("getRelatedEntityFileRules", () => {
  it("returns rules for property", () => {
    expect(getRelatedEntityFileRules("property")).toEqual({
      viewCapability: "property.view",
      manageCapability: "property.manage_documents",
    });
  });

  it("returns rules for work_order", () => {
    expect(getRelatedEntityFileRules("work_order")).toEqual({
      viewCapability: "work_order.view",
      manageCapability: "work_order.manage_attachments",
    });
  });

  it("returns null for an unregistered entity type", () => {
    expect(getRelatedEntityFileRules("equipment")).toBeNull();
  });

  it("returns null when no entity type is given", () => {
    expect(getRelatedEntityFileRules(undefined)).toBeNull();
  });
});

// UNIT-EQUIP-1: the shape resolveRelatedEntityPropertyContext returns for an
// Equipment document/photo file — Unit-aware only when the Equipment is Unit-owned.
describe("canAccessRelatedEntityPropertyContext for Equipment files", () => {
  const UNIT_A_USER: PropertyScope = { kind: "scoped", access: [{ propertyId: "P", propertyUnitId: "unit-a" }] };
  const WHOLE_PROPERTY: PropertyScope = { kind: "scoped", access: [{ propertyId: "P", propertyUnitId: null }] };
  const unitOwned = (unitId: string) => ({ propertyId: "P", propertyUnitId: unitId, isUnitScopedEntity: true });
  const shared = { propertyId: "P", propertyUnitId: null, isUnitScopedEntity: false };

  it("hides another Unit's Equipment files from a Unit-restricted user", () => {
    expect(canAccessRelatedEntityPropertyContext(UNIT_A_USER, unitOwned("unit-b"))).toBe(false);
  });

  it("shows their own Unit's and Shared Equipment files", () => {
    expect(canAccessRelatedEntityPropertyContext(UNIT_A_USER, unitOwned("unit-a"))).toBe(true);
    expect(canAccessRelatedEntityPropertyContext(UNIT_A_USER, shared)).toBe(true);
  });

  it("shows every Unit's Equipment files to whole-Property access", () => {
    expect(canAccessRelatedEntityPropertyContext(WHOLE_PROPERTY, unitOwned("unit-b"))).toBe(true);
  });
});
