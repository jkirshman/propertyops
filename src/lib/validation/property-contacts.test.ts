import { describe, expect, it } from "vitest";

import { createPropertyContactSchema, updatePropertyContactSchema } from "./property-contacts";

describe("createPropertyContactSchema", () => {
  it("accepts a minimal valid contact", () => {
    expect(
      createPropertyContactSchema.safeParse({ name: "Jane Doe", contactType: "tenant" }).success,
    ).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createPropertyContactSchema.safeParse({ contactType: "tenant" }).success).toBe(false);
  });

  it("rejects an invalid contact type", () => {
    expect(
      createPropertyContactSchema.safeParse({ name: "Jane Doe", contactType: "vendor" }).success,
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      createPropertyContactSchema.safeParse({
        name: "Jane Doe",
        contactType: "tenant",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("treats a blank email as absent rather than invalid", () => {
    const result = createPropertyContactSchema.parse({
      name: "Jane Doe",
      contactType: "tenant",
      email: "   ",
    });
    expect(result.email).toBeUndefined();
  });
});

describe("updatePropertyContactSchema", () => {
  it("accepts a deactivation-only update", () => {
    expect(updatePropertyContactSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
