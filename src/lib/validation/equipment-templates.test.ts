import { describe, expect, it } from "vitest";

import {
  createEquipmentTemplateItemSchema,
  createEquipmentTemplateSchema,
  propertyEquipmentTemplateSelectionSchema,
} from "./equipment-templates";

describe("createEquipmentTemplateSchema", () => {
  it("accepts a minimal valid template", () => {
    expect(createEquipmentTemplateSchema.safeParse({ name: "Residential Rental" }).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createEquipmentTemplateSchema.safeParse({}).success).toBe(false);
  });
});

describe("createEquipmentTemplateItemSchema", () => {
  const VALID = { equipmentCatalogItemId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678" };

  it("defaults expectedQuantity to 1 and isRequired to true", () => {
    const result = createEquipmentTemplateItemSchema.parse(VALID);
    expect(result.expectedQuantity).toBe(1);
    expect(result.isRequired).toBe(true);
  });

  it("rejects a zero expected quantity", () => {
    expect(
      createEquipmentTemplateItemSchema.safeParse({ ...VALID, expectedQuantity: 0 }).success,
    ).toBe(false);
  });

  it("rejects an invalid catalog item id", () => {
    expect(
      createEquipmentTemplateItemSchema.safeParse({ equipmentCatalogItemId: "not-a-uuid" }).success,
    ).toBe(false);
  });
});

describe("propertyEquipmentTemplateSelectionSchema", () => {
  it("accepts 'none' mode with no templateId", () => {
    expect(propertyEquipmentTemplateSelectionSchema.safeParse({ mode: "none" }).success).toBe(true);
  });

  it("accepts 'default' mode with no templateId", () => {
    expect(propertyEquipmentTemplateSelectionSchema.safeParse({ mode: "default" }).success).toBe(true);
  });

  it("requires a templateId when mode is 'override'", () => {
    expect(propertyEquipmentTemplateSelectionSchema.safeParse({ mode: "override" }).success).toBe(
      false,
    );
  });

  it("accepts 'override' mode with a templateId", () => {
    expect(
      propertyEquipmentTemplateSelectionSchema.safeParse({
        mode: "override",
        templateId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown mode", () => {
    expect(propertyEquipmentTemplateSelectionSchema.safeParse({ mode: "bogus" }).success).toBe(false);
  });
});
