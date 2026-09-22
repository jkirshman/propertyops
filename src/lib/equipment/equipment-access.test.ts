import { describe, expect, it } from "vitest";

import type { PropertyScope } from "@/lib/auth/property-access";
import { excludePlansForHiddenEquipment } from "@/lib/preventive-maintenance/plan-access";
import { canViewPhotoEquipmentOwner } from "@/lib/property-photos/property-photos";

import {
  canAccessPropertyEquipment,
  equipmentUnitAssignmentError,
  filterAccessibleEquipment,
  isEquipmentLinkHidden,
  listAssignableEquipmentUnits,
  listUnitRestrictedPropertyIds,
  redactHiddenEquipmentLink,
  resolveEquipmentUnitAssignment,
  resolveHiddenEquipmentIds,
  type EquipmentUnitCandidate,
} from "./equipment-access";

// Marquette Strip Mall: four Units, one HVAC each, plus shared equipment.
const ORG = "org-1";
const MARQUETTE = "marquette";
const OTHER_PROPERTY = "other-property";

const equipment = {
  hvacA: { id: "hvac-a", propertyId: MARQUETTE, propertyUnitId: "unit-a" },
  hvacB: { id: "hvac-b", propertyId: MARQUETTE, propertyUnitId: "unit-b" },
  hvacC: { id: "hvac-c", propertyId: MARQUETTE, propertyUnitId: "unit-c" },
  hvacD: { id: "hvac-d", propertyId: MARQUETTE, propertyUnitId: "unit-d" },
  sharedPanel: { id: "shared-panel", propertyId: MARQUETTE, propertyUnitId: null },
  otherProperty: { id: "other-hvac", propertyId: OTHER_PROPERTY, propertyUnitId: null },
};
const ALL_EQUIPMENT = Object.values(equipment);
const MARQUETTE_EQUIPMENT = ALL_EQUIPMENT.filter((row) => row.propertyId === MARQUETTE);

// Admin: the unrestricted capability. Manager / whole-Property User: a
// whole-Property access row (the rule is access-row driven, not role driven).
const ADMIN: PropertyScope = { kind: "all" };
const WHOLE_MARQUETTE: PropertyScope = { kind: "scoped", access: [{ propertyId: MARQUETTE, propertyUnitId: null }] };
const UNIT_A_USER: PropertyScope = { kind: "scoped", access: [{ propertyId: MARQUETTE, propertyUnitId: "unit-a" }] };
const UNITS_A_B_USER: PropertyScope = {
  kind: "scoped",
  access: [
    { propertyId: MARQUETTE, propertyUnitId: "unit-a" },
    { propertyId: MARQUETTE, propertyUnitId: "unit-b" },
  ],
};
const NO_ACCESS: PropertyScope = { kind: "scoped", access: [] };

const visibleIds = (scope: PropertyScope, rows = ALL_EQUIPMENT) =>
  filterAccessibleEquipment(scope, rows).map((row) => row.id);

describe("canAccessPropertyEquipment / filterAccessibleEquipment", () => {
  it("Admin sees Property-wide and every Unit's Equipment", () => {
    expect(visibleIds(ADMIN)).toEqual(ALL_EQUIPMENT.map((row) => row.id));
  });

  it("a Manager / whole-Property User sees all Equipment of the assigned Property, and nothing elsewhere", () => {
    expect(visibleIds(WHOLE_MARQUETTE)).toEqual(MARQUETTE_EQUIPMENT.map((row) => row.id));
    expect(canAccessPropertyEquipment(WHOLE_MARQUETTE, equipment.otherProperty)).toBe(false);
  });

  it("a Unit A User sees Unit A + Shared Equipment only", () => {
    expect(visibleIds(UNIT_A_USER)).toEqual(["hvac-a", "shared-panel"]);
    expect(canAccessPropertyEquipment(UNIT_A_USER, equipment.hvacB)).toBe(false);
    expect(canAccessPropertyEquipment(UNIT_A_USER, equipment.hvacC)).toBe(false);
    expect(canAccessPropertyEquipment(UNIT_A_USER, equipment.hvacD)).toBe(false);
  });

  it("a Units A+B User sees A, B and Shared, but not C/D", () => {
    expect(visibleIds(UNITS_A_B_USER)).toEqual(["hvac-a", "hvac-b", "shared-panel"]);
  });

  it("a User with no Property access sees nothing (fail closed)", () => {
    expect(visibleIds(NO_ACCESS)).toEqual([]);
  });

  it("existing Equipment (NULL Unit) stays visible as Shared to Unit-restricted Users", () => {
    expect(canAccessPropertyEquipment(UNIT_A_USER, equipment.sharedPanel)).toBe(true);
    expect(canAccessPropertyEquipment(UNITS_A_B_USER, equipment.sharedPanel)).toBe(true);
  });

  it("direct access to hidden Equipment is denied (the detail/API guard)", () => {
    expect(canAccessPropertyEquipment(UNIT_A_USER, equipment.hvacB)).toBe(false);
    expect(canAccessPropertyEquipment(UNIT_A_USER, equipment.otherProperty)).toBe(false);
  });
});

describe("listUnitRestrictedPropertyIds / resolveHiddenEquipmentIds", () => {
  it("is empty for unrestricted and whole-Property scopes", () => {
    expect(listUnitRestrictedPropertyIds(ADMIN)).toEqual([]);
    expect(listUnitRestrictedPropertyIds(WHOLE_MARQUETTE)).toEqual([]);
  });

  it("lists a Property reached only through Unit rows", () => {
    expect(listUnitRestrictedPropertyIds(UNIT_A_USER)).toEqual([MARQUETTE]);
    expect(listUnitRestrictedPropertyIds(UNITS_A_B_USER)).toEqual([MARQUETTE]);
  });

  it("a whole-Property row outranks Unit rows for the same Property", () => {
    const mixed: PropertyScope = {
      kind: "scoped",
      access: [
        { propertyId: MARQUETTE, propertyUnitId: "unit-a" },
        { propertyId: MARQUETTE, propertyUnitId: null },
      ],
    };
    expect(listUnitRestrictedPropertyIds(mixed)).toEqual([]);
  });

  it("short-circuits without a query when nothing can be hidden", async () => {
    await expect(resolveHiddenEquipmentIds(ORG, ADMIN)).resolves.toEqual(new Set());
    await expect(resolveHiddenEquipmentIds(ORG, WHOLE_MARQUETTE)).resolves.toEqual(new Set());
    await expect(resolveHiddenEquipmentIds(ORG, NO_ACCESS)).resolves.toEqual(new Set());
  });
});

describe("related records that reference hidden Equipment", () => {
  const hidden = new Set(["hvac-b", "hvac-c", "hvac-d"]);

  it("isEquipmentLinkHidden ignores records with no Equipment", () => {
    expect(isEquipmentLinkHidden(hidden, null)).toBe(false);
    expect(isEquipmentLinkHidden(hidden, "hvac-a")).toBe(false);
    expect(isEquipmentLinkHidden(hidden, "hvac-b")).toBe(true);
  });

  it("a Work Order linked to hidden Equipment keeps its data but loses the Equipment link", () => {
    const workOrder = { id: "wo-1", subject: "No heat", propertyEquipmentId: "hvac-b" };
    expect(redactHiddenEquipmentLink(workOrder, hidden)).toEqual({
      id: "wo-1",
      subject: "No heat",
      propertyEquipmentId: null,
      propertyEquipmentRestricted: true,
    });
  });

  it("a Work Order linked to visible Equipment is unchanged", () => {
    const workOrder = { id: "wo-2", propertyEquipmentId: "hvac-a" };
    expect(redactHiddenEquipmentLink(workOrder, hidden)).toEqual({ ...workOrder, propertyEquipmentRestricted: false });
  });

  it("PM plans for hidden Equipment are excluded; property-wide and visible-Equipment plans stay", () => {
    const plans = [
      { id: "pm-a", propertyEquipmentId: "hvac-a" },
      { id: "pm-b", propertyEquipmentId: "hvac-b" },
      { id: "pm-roof", propertyEquipmentId: null },
    ];
    expect(excludePlansForHiddenEquipment(plans, hidden).map((plan) => plan.id)).toEqual(["pm-a", "pm-roof"]);
  });

  it("service records inherit Equipment visibility (vendor history rows carry the Equipment's Unit)", () => {
    const records = [
      { id: "sr-a", propertyId: MARQUETTE, propertyUnitId: "unit-a" },
      { id: "sr-b", propertyId: MARQUETTE, propertyUnitId: "unit-b" },
      { id: "sr-shared", propertyId: MARQUETTE, propertyUnitId: null },
      { id: "sr-elsewhere", propertyId: OTHER_PROPERTY, propertyUnitId: null },
    ];
    expect(visibleIds(UNIT_A_USER, records)).toEqual(["sr-a", "sr-shared"]);
  });

  it("Equipment photos inherit Equipment visibility; non-Equipment photos are unaffected", () => {
    const photo = (propertyEquipmentId: string | null, equipmentPropertyUnitId: string | null) => ({
      propertyId: MARQUETTE,
      propertyEquipmentId,
      equipmentPropertyUnitId,
    });
    expect(canViewPhotoEquipmentOwner(UNIT_A_USER, photo("hvac-a", "unit-a"))).toBe(true);
    expect(canViewPhotoEquipmentOwner(UNIT_A_USER, photo("hvac-b", "unit-b"))).toBe(false);
    expect(canViewPhotoEquipmentOwner(UNIT_A_USER, photo("shared-panel", null))).toBe(true);
    expect(canViewPhotoEquipmentOwner(UNIT_A_USER, photo(null, null))).toBe(true);
    expect(canViewPhotoEquipmentOwner(WHOLE_MARQUETTE, photo("hvac-b", "unit-b"))).toBe(true);
  });
});

describe("resolveEquipmentUnitAssignment", () => {
  const unitA: EquipmentUnitCandidate = { id: "unit-a", organizationId: ORG, propertyId: MARQUETTE, isActive: true };
  const base = {
    scope: WHOLE_MARQUETTE,
    organizationId: ORG,
    propertyId: MARQUETTE,
    supportsUnits: true,
    mode: "create" as const,
    requestedUnitId: "unit-a" as string | null | undefined,
    currentUnitId: null as string | null,
    unitCandidate: unitA as EquipmentUnitCandidate | null,
  };

  it("allows a Unit of the Equipment's own Property", () => {
    expect(resolveEquipmentUnitAssignment(base)).toBe("allowed");
  });

  it("defaults a create with no Unit to Property-wide", () => {
    expect(resolveEquipmentUnitAssignment({ ...base, requestedUnitId: undefined, unitCandidate: null })).toBe("allowed");
  });

  it("rejects a Unit of another Property", () => {
    expect(resolveEquipmentUnitAssignment({ ...base, unitCandidate: { ...unitA, propertyId: OTHER_PROPERTY } })).toBe(
      "invalid_unit",
    );
  });

  it("rejects a Unit of another organization", () => {
    expect(resolveEquipmentUnitAssignment({ ...base, unitCandidate: { ...unitA, organizationId: "org-2" } })).toBe(
      "invalid_unit",
    );
  });

  it("rejects a nonexistent Unit (lookup found nothing)", () => {
    expect(resolveEquipmentUnitAssignment({ ...base, unitCandidate: null })).toBe("invalid_unit");
  });

  it("rejects a candidate whose id doesn't match the request", () => {
    expect(resolveEquipmentUnitAssignment({ ...base, requestedUnitId: "unit-b" })).toBe("invalid_unit");
  });

  it("rejects assigning an inactive Unit", () => {
    expect(resolveEquipmentUnitAssignment({ ...base, unitCandidate: { ...unitA, isActive: false } })).toBe(
      "invalid_unit",
    );
  });

  it("rejects any Unit when the Property type doesn't support Units", () => {
    expect(resolveEquipmentUnitAssignment({ ...base, supportsUnits: false })).toBe("units_not_supported");
  });

  it("allows Property-wide on a Property type without Units", () => {
    expect(
      resolveEquipmentUnitAssignment({ ...base, supportsUnits: false, requestedUnitId: null, unitCandidate: null }),
    ).toBe("allowed");
  });

  it("leaves an update that doesn't touch the Unit — or re-sends the current, even inactive, Unit — unchanged", () => {
    const update = { ...base, mode: "update" as const, currentUnitId: "unit-a" };
    expect(resolveEquipmentUnitAssignment({ ...update, requestedUnitId: undefined })).toBe("unchanged");
    expect(
      resolveEquipmentUnitAssignment({ ...update, requestedUnitId: "unit-a", unitCandidate: { ...unitA, isActive: false } }),
    ).toBe("unchanged");
  });

  it("allows a whole-Property editor to move Unit → Property-wide and Property-wide → Unit", () => {
    const update = { ...base, mode: "update" as const };
    expect(resolveEquipmentUnitAssignment({ ...update, currentUnitId: "unit-a", requestedUnitId: null })).toBe("allowed");
    expect(resolveEquipmentUnitAssignment({ ...update, currentUnitId: null, requestedUnitId: "unit-a" })).toBe("allowed");
  });

  it("limits a Unit-restricted editor to their own Units and keeps them out of the Shared pool", () => {
    const restricted = { ...base, scope: UNIT_A_USER };
    expect(resolveEquipmentUnitAssignment(restricted)).toBe("allowed");
    expect(
      resolveEquipmentUnitAssignment({
        ...restricted,
        requestedUnitId: "unit-b",
        unitCandidate: { ...unitA, id: "unit-b" },
      }),
    ).toBe("forbidden");
    expect(resolveEquipmentUnitAssignment({ ...restricted, requestedUnitId: null, unitCandidate: null })).toBe(
      "forbidden",
    );
    expect(
      resolveEquipmentUnitAssignment({ ...restricted, mode: "update", currentUnitId: null, requestedUnitId: "unit-a" }),
    ).toBe("forbidden");
  });

  it("maps decisions to 400/403 responses with a user-facing message", () => {
    expect(equipmentUnitAssignmentError("forbidden").status).toBe(403);
    expect(equipmentUnitAssignmentError("invalid_unit")).toMatchObject({ status: 400, body: { error: "invalid_unit" } });
    expect(equipmentUnitAssignmentError("units_not_supported").body.message).toMatch(/Units/);
  });
});

describe("listAssignableEquipmentUnits", () => {
  const units = [
    { id: "unit-a", isActive: true },
    { id: "unit-b", isActive: true },
    { id: "unit-old", isActive: false },
  ];

  it("offers every active Unit plus Property-wide to a whole-Property editor", () => {
    expect(listAssignableEquipmentUnits(WHOLE_MARQUETTE, MARQUETTE, units)).toEqual({
      units: [units[0], units[1]],
      allowPropertyWide: true,
    });
  });

  it("offers a Unit-restricted editor only their Units and no Property-wide", () => {
    expect(listAssignableEquipmentUnits(UNIT_A_USER, MARQUETTE, units)).toEqual({
      units: [units[0]],
      allowPropertyWide: false,
    });
  });

  it("offers nothing on a Property the scope can't access", () => {
    expect(listAssignableEquipmentUnits(NO_ACCESS, MARQUETTE, units)).toEqual({ units: [], allowPropertyWide: false });
  });
});
