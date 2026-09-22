import { describe, expect, it } from "vitest";

import { isAssetVisibleForScope } from "./assets";
import type { PropertyScope } from "@/lib/auth/property-access";

const ALL: PropertyScope = { kind: "all" };
const NO_ACCESS: PropertyScope = { kind: "scoped", access: [] };
const ACCESS_A: PropertyScope = { kind: "scoped", access: [{ propertyId: "A", propertyUnitId: null }] };

describe("isAssetVisibleForScope", () => {
  it("is always visible for an unrestricted scope, assigned or not", () => {
    expect(isAssetVisibleForScope({ assignedPropertyId: "A" }, ALL)).toBe(true);
    expect(isAssetVisibleForScope({ assignedPropertyId: null }, ALL)).toBe(true);
  });

  it("is visible for a scoped user when assigned to an accessible property", () => {
    expect(isAssetVisibleForScope({ assignedPropertyId: "A" }, ACCESS_A)).toBe(true);
  });

  it("is hidden for a scoped user when assigned to a property outside their access", () => {
    expect(isAssetVisibleForScope({ assignedPropertyId: "B" }, ACCESS_A)).toBe(false);
  });

  it("is hidden for a scoped user when unassigned (assignedPropertyId null) — no leaking the unassigned pool", () => {
    expect(isAssetVisibleForScope({ assignedPropertyId: null }, ACCESS_A)).toBe(false);
  });

  it("is hidden for a scoped user when person-assigned (assignedPropertyId null)", () => {
    expect(isAssetVisibleForScope({ assignedPropertyId: null }, NO_ACCESS)).toBe(false);
  });

  it("fails closed for a scoped user with zero accessible properties", () => {
    expect(isAssetVisibleForScope({ assignedPropertyId: "A" }, NO_ACCESS)).toBe(false);
  });
});
