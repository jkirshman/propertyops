import { describe, expect, it } from "vitest";

import {
  createInspectionCategorySchema,
  updateInspectionCategorySchema,
} from "./inspection-categories";

const VALID = { name: "Safety", slug: "safety" };

describe("createInspectionCategorySchema", () => {
  it("accepts a minimal valid category", () => {
    expect(createInspectionCategorySchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createInspectionCategorySchema.safeParse({ slug: "safety" }).success).toBe(false);
  });

  it("lowercases an uppercase slug rather than rejecting it", () => {
    const result = createInspectionCategorySchema.parse({ ...VALID, slug: "SAFETY" });
    expect(result.slug).toBe("safety");
  });

  it("rejects a slug with spaces", () => {
    expect(
      createInspectionCategorySchema.safeParse({ ...VALID, slug: "fire life safety" }).success,
    ).toBe(false);
  });
});

describe("updateInspectionCategorySchema", () => {
  it("accepts an empty update", () => {
    expect(updateInspectionCategorySchema.safeParse({}).success).toBe(true);
  });

  it("accepts an active-flag-only update", () => {
    expect(updateInspectionCategorySchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
