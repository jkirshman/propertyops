import { describe, expect, it } from "vitest";

import { createVendorContactSchema, updateVendorContactSchema } from "./vendor-contacts";

describe("createVendorContactSchema", () => {
  it("accepts a minimal valid contact", () => {
    expect(createVendorContactSchema.safeParse({ name: "Jane Smith" }).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createVendorContactSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      createVendorContactSchema.safeParse({ name: "Jane Smith", email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("treats a blank mobilePhone as absent", () => {
    const result = createVendorContactSchema.parse({ name: "Jane Smith", mobilePhone: "" });
    expect(result.mobilePhone).toBeUndefined();
  });
});

describe("updateVendorContactSchema", () => {
  it("accepts an empty update", () => {
    expect(updateVendorContactSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an active-flag-only update", () => {
    expect(updateVendorContactSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
