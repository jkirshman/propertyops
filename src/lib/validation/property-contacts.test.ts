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

  it("accepts the asset_manager contact type", () => {
    expect(
      createPropertyContactSchema.safeParse({ name: "Jane Doe", contactType: "asset_manager" }).success,
    ).toBe(true);
  });

  it("accepts title and mobilePhone", () => {
    const result = createPropertyContactSchema.parse({
      name: "Jane Doe",
      contactType: "asset_manager",
      title: "Regional Asset Manager",
      mobilePhone: "555-0100",
    });
    expect(result.title).toBe("Regional Asset Manager");
    expect(result.mobilePhone).toBe("555-0100");
  });
});

describe("updatePropertyContactSchema", () => {
  it("accepts a deactivation-only update", () => {
    expect(updatePropertyContactSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
