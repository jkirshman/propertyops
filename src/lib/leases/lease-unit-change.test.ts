import { describe, expect, it } from "vitest";

import type { PropertyScope } from "@/lib/auth/property-access";

import { resolveLeaseUnitChangeDecision } from "./lease-unit-change";

const PROPERTY_A = "property-a";
const UNIT_1 = { id: "unit-1", isActive: true };
const UNIT_2 = { id: "unit-2", isActive: true };
const INACTIVE_UNIT = { id: "unit-3", isActive: false };

const ADMIN_SCOPE: PropertyScope = { kind: "all" };
const MANAGER_SCOPE_PROPERTY_A: PropertyScope = {
  kind: "scoped",
  access: [{ propertyId: PROPERTY_A, propertyUnitId: null }], // whole-property access
};
const USER_SCOPE_UNIT_1_ONLY: PropertyScope = {
  kind: "scoped",
  access: [{ propertyId: PROPERTY_A, propertyUnitId: UNIT_1.id }],
};
const NO_ACCESS_SCOPE: PropertyScope = { kind: "scoped", access: [] };

describe("resolveLeaseUnitChangeDecision", () => {
  it("Admin (unrestricted scope) may move a Lease to any valid Unit", () => {
    expect(resolveLeaseUnitChangeDecision(ADMIN_SCOPE, PROPERTY_A, UNIT_2.id, UNIT_1.id, UNIT_2)).toBe(
      "allowed",
    );
  });

  it("Manager with whole-property access may move a Lease between Units within that Property", () => {
    expect(
      resolveLeaseUnitChangeDecision(MANAGER_SCOPE_PROPERTY_A, PROPERTY_A, UNIT_2.id, UNIT_1.id, UNIT_2),
    ).toBe("allowed");
  });

  it("a Unit-restricted caller cannot move a Lease to a Unit outside their access", () => {
    expect(
      resolveLeaseUnitChangeDecision(USER_SCOPE_UNIT_1_ONLY, PROPERTY_A, UNIT_2.id, UNIT_1.id, UNIT_2),
    ).toBe("forbidden");
  });

  it("a caller with no property access at all cannot move a Lease to any Unit", () => {
    expect(
      resolveLeaseUnitChangeDecision(NO_ACCESS_SCOPE, PROPERTY_A, UNIT_2.id, UNIT_1.id, UNIT_2),
    ).toBe("forbidden");
  });

  it("a Unit belonging to a different Property is rejected as invalid — the caller's getPropertyUnit lookup (org+Property scoped) resolves to null for it", () => {
    // Simulates: fields.propertyUnitId pointed at a Unit under PROPERTY_B,
    // so getPropertyUnit(organizationId, PROPERTY_A, thatUnitId) found nothing.
    expect(
      resolveLeaseUnitChangeDecision(ADMIN_SCOPE, PROPERTY_A, "unit-from-property-b", UNIT_1.id, null),
    ).toBe("invalid_unit");
  });

  it("a Unit belonging to a different organization is rejected as invalid — the caller's org-scoped lookup resolves to null for it", () => {
    // Simulates: fields.propertyUnitId pointed at a Unit id that exists only
    // in another org, so getPropertyUnit(thisOrgId, PROPERTY_A, thatUnitId)
    // found nothing.
    expect(
      resolveLeaseUnitChangeDecision(ADMIN_SCOPE, PROPERTY_A, "unit-from-another-org", UNIT_1.id, null),
    ).toBe("invalid_unit");
  });

  it("an inactive Unit is rejected as invalid even for an unrestricted scope", () => {
    expect(
      resolveLeaseUnitChangeDecision(ADMIN_SCOPE, PROPERTY_A, INACTIVE_UNIT.id, UNIT_1.id, INACTIVE_UNIT),
    ).toBe("invalid_unit");
  });

  it("an unchanged Unit never triggers a scope lookup or denial, even for a caller with no access", () => {
    expect(
      resolveLeaseUnitChangeDecision(NO_ACCESS_SCOPE, PROPERTY_A, UNIT_1.id, UNIT_1.id, UNIT_1),
    ).toBe("unchanged");
  });

  it("omitting propertyUnitId entirely (undefined) needs no target-Unit check, even for a caller with no access", () => {
    expect(
      resolveLeaseUnitChangeDecision(NO_ACCESS_SCOPE, PROPERTY_A, undefined, UNIT_1.id, null),
    ).toBe("unchanged");
  });

  it("clearing propertyUnitId to null (back to property-wide) needs no target-Unit check, even for a caller with no access", () => {
    expect(resolveLeaseUnitChangeDecision(NO_ACCESS_SCOPE, PROPERTY_A, null, UNIT_1.id, null)).toBe(
      "unchanged",
    );
  });
});
