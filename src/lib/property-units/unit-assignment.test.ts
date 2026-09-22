import { describe, expect, it } from "vitest";

import type { PropertyScope } from "@/lib/auth/property-access";

import {
  deriveGeneratedWorkOrderUnitId,
  listAssignableUnits,
  reconcileUnitWithEquipment,
  resolveUnitAssignment,
  unitAssignmentError,
  type UnitCandidate,
} from "./unit-assignment";

// St. Joe: one Property, two operationally separate businesses.
const ORG = "org-1";
const ST_JOE = "st-joe";
const OTHER_PROPERTY = "other-property";
const FITNESS = "unit-fitness";
const RESTAURANT = "unit-restaurant";

const ADMIN: PropertyScope = { kind: "all" };
const WHOLE_ST_JOE: PropertyScope = { kind: "scoped", access: [{ propertyId: ST_JOE, propertyUnitId: null }] };
const FITNESS_USER: PropertyScope = { kind: "scoped", access: [{ propertyId: ST_JOE, propertyUnitId: FITNESS }] };
const BOTH_UNITS_USER: PropertyScope = {
  kind: "scoped",
  access: [
    { propertyId: ST_JOE, propertyUnitId: FITNESS },
    { propertyId: ST_JOE, propertyUnitId: RESTAURANT },
  ],
};

const unit = (id: string, overrides: Partial<UnitCandidate> = {}): UnitCandidate => ({
  id,
  organizationId: ORG,
  propertyId: ST_JOE,
  isActive: true,
  ...overrides,
});

// Work Order / Inspection policy: a new Property-wide record is open to anyone.
const decide = (
  scope: PropertyScope,
  overrides: Partial<Parameters<typeof resolveUnitAssignment>[0]> = {},
) =>
  resolveUnitAssignment({
    scope,
    organizationId: ORG,
    propertyId: ST_JOE,
    supportsUnits: true,
    mode: "create",
    requestedUnitId: undefined,
    currentUnitId: null,
    unitCandidate: null,
    sharedCreateRequiresWholeProperty: false,
    ...overrides,
  });

describe("resolveUnitAssignment (Work Orders / Inspections)", () => {
  it("defaults a new record to Property-wide / Shared", () => {
    expect(decide(WHOLE_ST_JOE)).toBe("allowed");
  });

  it("lets any user with Property access create a Shared record (e.g. parking lot light out)", () => {
    expect(decide(FITNESS_USER, { requestedUnitId: null })).toBe("allowed");
  });

  it("allows a Unit the caller can access", () => {
    expect(decide(FITNESS_USER, { requestedUnitId: FITNESS, unitCandidate: unit(FITNESS) })).toBe("allowed");
    expect(decide(WHOLE_ST_JOE, { requestedUnitId: RESTAURANT, unitCandidate: unit(RESTAURANT) })).toBe("allowed");
    expect(decide(ADMIN, { requestedUnitId: RESTAURANT, unitCandidate: unit(RESTAURANT) })).toBe("allowed");
  });

  it("forbids assigning another Unit", () => {
    expect(decide(FITNESS_USER, { requestedUnitId: RESTAURANT, unitCandidate: unit(RESTAURANT) })).toBe(
      "forbidden",
    );
  });

  it("rejects a nonexistent, cross-Property, cross-org, or inactive Unit", () => {
    expect(decide(ADMIN, { requestedUnitId: "missing", unitCandidate: null })).toBe("invalid_unit");
    expect(
      decide(ADMIN, { requestedUnitId: FITNESS, unitCandidate: unit(FITNESS, { propertyId: OTHER_PROPERTY }) }),
    ).toBe("invalid_unit");
    expect(decide(ADMIN, { requestedUnitId: FITNESS, unitCandidate: unit(FITNESS, { organizationId: "org-2" }) })).toBe(
      "invalid_unit",
    );
    expect(decide(ADMIN, { requestedUnitId: FITNESS, unitCandidate: unit(FITNESS, { isActive: false }) })).toBe(
      "invalid_unit",
    );
  });

  it("rejects any Unit on a Property type without Units", () => {
    expect(decide(ADMIN, { supportsUnits: false, requestedUnitId: FITNESS, unitCandidate: unit(FITNESS) })).toBe(
      "units_not_supported",
    );
    expect(decide(ADMIN, { supportsUnits: false, requestedUnitId: null })).toBe("allowed");
  });

  it("never blocks an update that doesn't move the record — even on a since-deactivated Unit", () => {
    expect(decide(FITNESS_USER, { mode: "update", requestedUnitId: undefined, currentUnitId: FITNESS })).toBe(
      "unchanged",
    );
    expect(decide(FITNESS_USER, { mode: "update", requestedUnitId: FITNESS, currentUnitId: FITNESS })).toBe(
      "unchanged",
    );
  });

  it("requires whole-Property access to move an existing record into or out of Shared", () => {
    expect(decide(FITNESS_USER, { mode: "update", requestedUnitId: null, currentUnitId: FITNESS })).toBe("forbidden");
    expect(
      decide(FITNESS_USER, { mode: "update", requestedUnitId: FITNESS, currentUnitId: null, unitCandidate: unit(FITNESS) }),
    ).toBe("forbidden");
    expect(decide(WHOLE_ST_JOE, { mode: "update", requestedUnitId: null, currentUnitId: FITNESS })).toBe("allowed");
    expect(
      decide(WHOLE_ST_JOE, { mode: "update", requestedUnitId: FITNESS, currentUnitId: null, unitCandidate: unit(FITNESS) }),
    ).toBe("allowed");
  });

  it("lets a multi-Unit user move a record between their own Units only", () => {
    expect(
      decide(BOTH_UNITS_USER, {
        mode: "update",
        requestedUnitId: RESTAURANT,
        currentUnitId: FITNESS,
        unitCandidate: unit(RESTAURANT),
      }),
    ).toBe("allowed");
    expect(
      decide(FITNESS_USER, {
        mode: "update",
        requestedUnitId: RESTAURANT,
        currentUnitId: FITNESS,
        unitCandidate: unit(RESTAURANT),
      }),
    ).toBe("forbidden");
  });

  it("keeps UNIT-EQUIP-1's stricter policy when asked (Equipment: creating Shared needs whole-Property)", () => {
    expect(decide(FITNESS_USER, { requestedUnitId: null, sharedCreateRequiresWholeProperty: true })).toBe("forbidden");
    expect(decide(WHOLE_ST_JOE, { requestedUnitId: null, sharedCreateRequiresWholeProperty: true })).toBe("allowed");
  });

  it("maps failures to 403 for access and 400 for invalid input", () => {
    expect(unitAssignmentError("forbidden", "work orders").status).toBe(403);
    expect(unitAssignmentError("invalid_unit", "work orders").status).toBe(400);
    expect(unitAssignmentError("units_not_supported", "inspections").body.error).toBe("units_not_supported");
  });
});

describe("reconcileUnitWithEquipment (Work Order / Inspection ↔ Equipment consistency)", () => {
  it("A: Unit A Equipment + Unit A record is allowed", () => {
    expect(
      reconcileUnitWithEquipment({ requestedUnitId: FITNESS, currentUnitId: undefined, equipmentUnitId: FITNESS }),
    ).toEqual({ ok: true, requestedUnitId: FITNESS });
  });

  it("A: selecting Unit A Equipment without naming a Unit adopts Unit A", () => {
    expect(
      reconcileUnitWithEquipment({ requestedUnitId: undefined, currentUnitId: undefined, equipmentUnitId: FITNESS }),
    ).toEqual({ ok: true, requestedUnitId: FITNESS });
    // Already on that Unit (update): nothing to change.
    expect(
      reconcileUnitWithEquipment({ requestedUnitId: undefined, currentUnitId: FITNESS, equipmentUnitId: FITNESS }),
    ).toEqual({ ok: true, requestedUnitId: undefined });
  });

  it("B: Shared Equipment leaves the record free to be Shared or any Unit", () => {
    expect(reconcileUnitWithEquipment({ requestedUnitId: null, currentUnitId: undefined, equipmentUnitId: null })).toEqual(
      { ok: true, requestedUnitId: null },
    );
    expect(
      reconcileUnitWithEquipment({ requestedUnitId: RESTAURANT, currentUnitId: undefined, equipmentUnitId: null }),
    ).toEqual({ ok: true, requestedUnitId: RESTAURANT });
  });

  it("C: Unit B record + Unit A Equipment is rejected", () => {
    expect(
      reconcileUnitWithEquipment({ requestedUnitId: RESTAURANT, currentUnitId: undefined, equipmentUnitId: FITNESS }),
    ).toEqual({ ok: false });
  });

  it("D: an explicitly Shared record + Unit A Equipment is rejected", () => {
    expect(reconcileUnitWithEquipment({ requestedUnitId: null, currentUnitId: FITNESS, equipmentUnitId: FITNESS })).toEqual(
      { ok: false },
    );
  });
});

describe("deriveGeneratedWorkOrderUnitId", () => {
  it("PM: a Work Order generated from Unit A Equipment is Unit A", () => {
    expect(deriveGeneratedWorkOrderUnitId({ sourceUnitId: null, equipmentUnitId: FITNESS })).toBe(FITNESS);
  });

  it("PM: Shared Equipment (or no Equipment) generates a Shared Work Order", () => {
    expect(deriveGeneratedWorkOrderUnitId({ sourceUnitId: null, equipmentUnitId: null })).toBeNull();
  });

  it("Inspection: a finding from a Fitness Center Inspection generates a Fitness Center Work Order", () => {
    expect(deriveGeneratedWorkOrderUnitId({ sourceUnitId: FITNESS, equipmentUnitId: null })).toBe(FITNESS);
  });

  it("Inspection: a Shared Inspection's finding stays Shared unless its Equipment is Unit-owned", () => {
    expect(deriveGeneratedWorkOrderUnitId({ sourceUnitId: null, equipmentUnitId: null })).toBeNull();
    expect(deriveGeneratedWorkOrderUnitId({ sourceUnitId: null, equipmentUnitId: RESTAURANT })).toBe(RESTAURANT);
  });

  it("Unit-owned Equipment always wins, so the generated Work Order can't contradict it", () => {
    expect(deriveGeneratedWorkOrderUnitId({ sourceUnitId: FITNESS, equipmentUnitId: RESTAURANT })).toBe(RESTAURANT);
  });
});

describe("listAssignableUnits", () => {
  const units = [
    { id: FITNESS, isActive: true },
    { id: RESTAURANT, isActive: true },
    { id: "unit-closed", isActive: false },
  ];

  it("offers whole-Property editors every active Unit", () => {
    expect(listAssignableUnits(WHOLE_ST_JOE, ST_JOE, units)).toEqual({
      units: units.slice(0, 2),
      wholeProperty: true,
    });
  });

  it("offers a Unit-restricted editor only their own active Units (selector leakage)", () => {
    expect(listAssignableUnits(FITNESS_USER, ST_JOE, units)).toEqual({
      units: [{ id: FITNESS, isActive: true }],
      wholeProperty: false,
    });
  });

  it("never offers an inactive Unit for new assignments", () => {
    expect(listAssignableUnits(ADMIN, ST_JOE, units).units.map((u) => u.id)).not.toContain("unit-closed");
  });
});
