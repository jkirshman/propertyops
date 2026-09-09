import { describe, expect, it } from "vitest";

import { createPropertyUnitSchema, updatePropertyUnitSchema } from "./property-units";

describe("createPropertyUnitSchema", () => {
  it("accepts a minimal valid unit", () => {
    expect(createPropertyUnitSchema.safeParse({ unitLabel: "Suite 100" }).success).toBe(true);
  });

  it("rejects a missing unit label", () => {
    expect(createPropertyUnitSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a blank unit label", () => {
    expect(createPropertyUnitSchema.safeParse({ unitLabel: "   " }).success).toBe(false);
  });

  it("coerces a string square footage", () => {
    expect(createPropertyUnitSchema.parse({ unitLabel: "A", squareFootage: "1200" }).squareFootage).toBe(1200);
  });
});

describe("updatePropertyUnitSchema", () => {
  it("accepts an empty update", () => {
    expect(updatePropertyUnitSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an explicit null to clear square footage", () => {
    expect(updatePropertyUnitSchema.parse({ squareFootage: null }).squareFootage).toBeNull();
  });

  it("accepts an active-flag-only update", () => {
    expect(updatePropertyUnitSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
