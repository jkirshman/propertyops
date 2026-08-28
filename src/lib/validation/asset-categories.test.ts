import { describe, expect, it } from "vitest";

import { createAssetCategorySchema, updateAssetCategorySchema } from "./asset-categories";

describe("createAssetCategorySchema", () => {
  it("accepts a minimal valid category", () => {
    expect(createAssetCategorySchema.safeParse({ name: "Vehicle", slug: "vehicle" }).success).toBe(
      true,
    );
  });

  it("rejects a missing name", () => {
    expect(createAssetCategorySchema.safeParse({ slug: "vehicle" }).success).toBe(false);
  });

  it("rejects an invalid slug", () => {
    expect(
      createAssetCategorySchema.safeParse({ name: "Vehicle", slug: "Not A Slug!" }).success,
    ).toBe(false);
  });
});

describe("updateAssetCategorySchema", () => {
  it("accepts an empty update", () => {
    expect(updateAssetCategorySchema.safeParse({}).success).toBe(true);
  });

  it("accepts deactivation only", () => {
    expect(updateAssetCategorySchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
