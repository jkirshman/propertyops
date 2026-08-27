import { describe, expect, it } from "vitest";

import { createPropertySchema, updatePropertySchema } from "./properties";

const VALID = {
  propertyTypeId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
  name: "Main Street Plaza",
  occupancyModel: "owned",
};

describe("createPropertySchema", () => {
  it("accepts a minimal valid property", () => {
    expect(createPropertySchema.safeParse(VALID).success).toBe(true);
  });

  it("defaults occupancyModel to 'other' when omitted", () => {
    const result = createPropertySchema.parse({
      propertyTypeId: VALID.propertyTypeId,
      name: VALID.name,
    });
    expect(result.occupancyModel).toBe("other");
  });

  it("rejects a missing name", () => {
    expect(
      createPropertySchema.safeParse({
        propertyTypeId: VALID.propertyTypeId,
        occupancyModel: VALID.occupancyModel,
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid property type id", () => {
    expect(
      createPropertySchema.safeParse({ ...VALID, propertyTypeId: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("rejects an invalid occupancy model", () => {
    expect(createPropertySchema.safeParse({ ...VALID, occupancyModel: "rented" }).success).toBe(
      false,
    );
  });

  it("treats blank optional strings as absent", () => {
    const result = createPropertySchema.parse({ ...VALID, city: "   " });
    expect(result.city).toBeUndefined();
  });

  it("rejects an invalid primary email", () => {
    expect(
      createPropertySchema.safeParse({ ...VALID, primaryEmail: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects a year built far in the future", () => {
    expect(createPropertySchema.safeParse({ ...VALID, yearBuilt: 3000 }).success).toBe(false);
  });
});

describe("updatePropertySchema", () => {
  it("accepts a partial update", () => {
    expect(updatePropertySchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("accepts an empty update", () => {
    expect(updatePropertySchema.safeParse({}).success).toBe(true);
  });

  it("still validates provided fields", () => {
    expect(updatePropertySchema.safeParse({ occupancyModel: "invalid" }).success).toBe(false);
  });
});
