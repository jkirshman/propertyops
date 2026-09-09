import { describe, expect, it } from "vitest";

import { createPropertyComponentSchema, updatePropertyComponentSchema } from "./property-components";

describe("createPropertyComponentSchema", () => {
  it("accepts a minimal valid roof component", () => {
    expect(createPropertyComponentSchema.safeParse({ componentType: "roof" }).success).toBe(true);
  });

  it("defaults condition to unknown", () => {
    expect(createPropertyComponentSchema.parse({ componentType: "roof" }).condition).toBe("unknown");
  });

  it("rejects an invalid component type", () => {
    expect(createPropertyComponentSchema.safeParse({ componentType: "swimming_pool" }).success).toBe(false);
  });

  it("requires otherTypeLabel when componentType is other", () => {
    expect(createPropertyComponentSchema.safeParse({ componentType: "other" }).success).toBe(false);
  });

  it("accepts other with a label", () => {
    expect(
      createPropertyComponentSchema.safeParse({ componentType: "other", otherTypeLabel: "Retaining wall" }).success,
    ).toBe(true);
  });

  it("accepts a valid condition", () => {
    expect(createPropertyComponentSchema.parse({ componentType: "roof", condition: "fair" }).condition).toBe("fair");
  });

  it("rejects an invalid condition", () => {
    expect(createPropertyComponentSchema.safeParse({ componentType: "roof", condition: "excellent" }).success).toBe(
      false,
    );
  });
});

describe("updatePropertyComponentSchema", () => {
  it("accepts an empty update", () => {
    expect(updatePropertyComponentSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an explicit null to clear the vendor", () => {
    expect(updatePropertyComponentSchema.parse({ vendorId: null }).vendorId).toBeNull();
  });

  it("requires otherTypeLabel when changing componentType to other", () => {
    expect(updatePropertyComponentSchema.safeParse({ componentType: "other" }).success).toBe(false);
  });

  it("accepts changing componentType to other with a label", () => {
    expect(
      updatePropertyComponentSchema.safeParse({ componentType: "other", otherTypeLabel: "Retaining wall" }).success,
    ).toBe(true);
  });

  it("accepts an isActive-only update", () => {
    expect(updatePropertyComponentSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
