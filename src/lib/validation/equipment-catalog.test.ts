import { describe, expect, it } from "vitest";

import { createEquipmentCatalogItemSchema, updateEquipmentCatalogItemSchema } from "./equipment-catalog";

const VALID = { name: "Rooftop HVAC Unit", slug: "rooftop-hvac-unit" };

describe("createEquipmentCatalogItemSchema", () => {
  it("accepts a minimal valid catalog item", () => {
    expect(createEquipmentCatalogItemSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createEquipmentCatalogItemSchema.safeParse({ slug: VALID.slug }).success).toBe(false);
  });

  it("rejects an invalid slug", () => {
    expect(
      createEquipmentCatalogItemSchema.safeParse({ ...VALID, slug: "Not A Slug!" }).success,
    ).toBe(false);
  });

  it("treats blank optional strings as absent", () => {
    const result = createEquipmentCatalogItemSchema.parse({ ...VALID, category: "   " });
    expect(result.category).toBeUndefined();
  });
});

describe("updateEquipmentCatalogItemSchema", () => {
  it("accepts an empty update", () => {
    expect(updateEquipmentCatalogItemSchema.safeParse({}).success).toBe(true);
  });

  it("accepts deactivation only", () => {
    expect(updateEquipmentCatalogItemSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
