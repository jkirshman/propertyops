import { describe, expect, it } from "vitest";

import { createVendorCategorySchema, updateVendorCategorySchema } from "./vendor-categories";

const VALID = { name: "HVAC", slug: "hvac" };

describe("createVendorCategorySchema", () => {
  it("accepts a minimal valid category", () => {
    expect(createVendorCategorySchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createVendorCategorySchema.safeParse({ slug: "hvac" }).success).toBe(false);
  });

  it("lowercases an uppercase slug rather than rejecting it", () => {
    const result = createVendorCategorySchema.parse({ ...VALID, slug: "HVAC" });
    expect(result.slug).toBe("hvac");
  });

  it("rejects a slug with spaces", () => {
    expect(
      createVendorCategorySchema.safeParse({ ...VALID, slug: "fire life safety" }).success,
    ).toBe(false);
  });
});

describe("updateVendorCategorySchema", () => {
  it("accepts an empty update", () => {
    expect(updateVendorCategorySchema.safeParse({}).success).toBe(true);
  });

  it("accepts an active-flag-only update", () => {
    expect(updateVendorCategorySchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
