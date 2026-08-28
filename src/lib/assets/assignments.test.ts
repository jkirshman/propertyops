import { describe, expect, it } from "vitest";

import { computeAssetStateForMove, isAssetMovable } from "./assignments";

describe("isAssetMovable", () => {
  it("allows movement for available assets", () => {
    expect(isAssetMovable("available")).toBe(true);
  });

  it("allows movement for assigned assets", () => {
    expect(isAssetMovable("assigned")).toBe(true);
  });

  it("allows movement for lost assets (treated as recoverable)", () => {
    expect(isAssetMovable("lost")).toBe(true);
  });

  it("blocks movement for retired assets", () => {
    expect(isAssetMovable("retired")).toBe(false);
  });

  it("blocks movement for disposed assets", () => {
    expect(isAssetMovable("disposed")).toBe(false);
  });
});

describe("computeAssetStateForMove", () => {
  it("assigning to a person sets assignmentType/personId and status assigned", () => {
    expect(computeAssetStateForMove("person", "person-1", null)).toEqual({
      assignmentType: "person",
      assignedPersonId: "person-1",
      assignedPropertyId: null,
      status: "assigned",
    });
  });

  it("assigning to a property sets assignmentType/propertyId and status assigned", () => {
    expect(computeAssetStateForMove("property", null, "property-1")).toEqual({
      assignmentType: "property",
      assignedPersonId: null,
      assignedPropertyId: "property-1",
      status: "assigned",
    });
  });

  it("returning to unassigned clears both holders and resets status to available", () => {
    expect(computeAssetStateForMove("unassigned", "person-1", "property-1")).toEqual({
      assignmentType: "unassigned",
      assignedPersonId: null,
      assignedPropertyId: null,
      status: "available",
    });
  });

  it("never sets both a person and a property holder at once", () => {
    const toPerson = computeAssetStateForMove("person", "person-1");
    expect(toPerson.assignedPropertyId).toBeNull();

    const toProperty = computeAssetStateForMove("property", undefined, "property-1");
    expect(toProperty.assignedPersonId).toBeNull();
  });
});
