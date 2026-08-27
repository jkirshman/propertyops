import { describe, expect, it } from "vitest";

import {
  createWorkOrderCategorySchema,
  updateWorkOrderCategorySchema,
} from "./work-order-categories";

describe("createWorkOrderCategorySchema", () => {
  it("accepts a valid category", () => {
    expect(createWorkOrderCategorySchema.safeParse({ name: "HVAC", slug: "hvac" }).success).toBe(
      true,
    );
  });

  it("rejects a slug with spaces", () => {
    expect(
      createWorkOrderCategorySchema.safeParse({ name: "HVAC", slug: "h vac" }).success,
    ).toBe(false);
  });

  it("normalizes an uppercase slug to lowercase", () => {
    const result = createWorkOrderCategorySchema.parse({ name: "HVAC", slug: "HVAC" });
    expect(result.slug).toBe("hvac");
  });

  it("rejects a blank name", () => {
    expect(createWorkOrderCategorySchema.safeParse({ name: "  ", slug: "hvac" }).success).toBe(
      false,
    );
  });
});

describe("updateWorkOrderCategorySchema", () => {
  it("accepts a deactivation-only update", () => {
    expect(updateWorkOrderCategorySchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
