import { describe, expect, it } from "vitest";

import {
  createInspectionTemplateSchema,
  updateInspectionTemplateSchema,
} from "./inspection-templates";

const VALID = {
  name: "Move-In Condition Report",
  categoryId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
};

describe("createInspectionTemplateSchema", () => {
  it("accepts a minimal valid template", () => {
    expect(createInspectionTemplateSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createInspectionTemplateSchema.safeParse({ categoryId: VALID.categoryId }).success).toBe(
      false,
    );
  });

  it("rejects a missing category", () => {
    expect(createInspectionTemplateSchema.safeParse({ name: VALID.name }).success).toBe(false);
  });

  it("treats a blank property type as absent", () => {
    const result = createInspectionTemplateSchema.parse({ ...VALID, propertyTypeId: "" });
    expect(result.propertyTypeId).toBeUndefined();
  });

  it("accepts an optional property type", () => {
    const result = createInspectionTemplateSchema.parse({
      ...VALID,
      propertyTypeId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5679",
    });
    expect(result.propertyTypeId).toBe("5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5679");
  });
});

describe("updateInspectionTemplateSchema", () => {
  it("accepts an empty update", () => {
    expect(updateInspectionTemplateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an active-flag-only update", () => {
    expect(updateInspectionTemplateSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("accepts an explicit null to clear property type", () => {
    const result = updateInspectionTemplateSchema.parse({ propertyTypeId: null });
    expect(result.propertyTypeId).toBeNull();
  });
});
