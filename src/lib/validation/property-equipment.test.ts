import { describe, expect, it } from "vitest";

import { createPropertyEquipmentSchema, updatePropertyEquipmentSchema } from "./property-equipment";

const VALID = {
  equipmentCatalogItemId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
  displayName: "Rooftop Unit 1",
};

describe("createPropertyEquipmentSchema", () => {
  it("accepts a minimal valid record", () => {
    expect(createPropertyEquipmentSchema.safeParse(VALID).success).toBe(true);
  });

  it("defaults quantity to 1, status to active, condition to unknown", () => {
    const result = createPropertyEquipmentSchema.parse(VALID);
    expect(result.quantity).toBe(1);
    expect(result.status).toBe("active");
    expect(result.condition).toBe("unknown");
  });

  it("rejects a missing display name", () => {
    expect(
      createPropertyEquipmentSchema.safeParse({ equipmentCatalogItemId: VALID.equipmentCatalogItemId })
        .success,
    ).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(createPropertyEquipmentSchema.safeParse({ ...VALID, status: "broken" }).success).toBe(
      false,
    );
  });

  it("rejects an invalid condition", () => {
    expect(createPropertyEquipmentSchema.safeParse({ ...VALID, condition: "excellent" }).success).toBe(
      false,
    );
  });

  it("rejects a malformed installed date", () => {
    expect(
      createPropertyEquipmentSchema.safeParse({ ...VALID, installedDate: "01/01/2024" }).success,
    ).toBe(false);
  });

  it("accepts a well-formed installed date", () => {
    expect(
      createPropertyEquipmentSchema.safeParse({ ...VALID, installedDate: "2024-01-15" }).success,
    ).toBe(true);
  });

  it("rejects a zero quantity", () => {
    expect(createPropertyEquipmentSchema.safeParse({ ...VALID, quantity: 0 }).success).toBe(false);
  });
});

describe("updatePropertyEquipmentSchema", () => {
  it("accepts an empty update", () => {
    expect(updatePropertyEquipmentSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a status-only update", () => {
    expect(updatePropertyEquipmentSchema.safeParse({ status: "retired", isActive: false }).success).toBe(
      true,
    );
  });
});
