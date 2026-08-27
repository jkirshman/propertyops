import { describe, expect, it } from "vitest";

import { createPropertyTypeSchema, updatePropertyTypeSchema } from "./property-types";

describe("createPropertyTypeSchema", () => {
  it("accepts a valid property type", () => {
    expect(
      createPropertyTypeSchema.safeParse({ name: "Residential Rental", slug: "residential-rental" })
        .success,
    ).toBe(true);
  });

  it("normalizes an uppercase slug to lowercase rather than rejecting it", () => {
    const result = createPropertyTypeSchema.parse({ name: "Test", slug: "Residential-Rental" });
    expect(result.slug).toBe("residential-rental");
  });

  it("rejects a slug with spaces", () => {
    expect(
      createPropertyTypeSchema.safeParse({ name: "Test", slug: "residential rental" }).success,
    ).toBe(false);
  });

  it("rejects a slug with leading/trailing hyphens", () => {
    expect(createPropertyTypeSchema.safeParse({ name: "Test", slug: "-test-" }).success).toBe(
      false,
    );
  });

  it("rejects a blank name", () => {
    expect(createPropertyTypeSchema.safeParse({ name: "  ", slug: "test" }).success).toBe(false);
  });
});

describe("updatePropertyTypeSchema", () => {
  it("accepts a partial update", () => {
    expect(updatePropertyTypeSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("accepts an empty update", () => {
    expect(updatePropertyTypeSchema.safeParse({}).success).toBe(true);
  });
});
