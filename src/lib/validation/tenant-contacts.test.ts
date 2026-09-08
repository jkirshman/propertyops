import { describe, expect, it } from "vitest";

import { createTenantContactSchema, updateTenantContactSchema } from "./tenant-contacts";

describe("createTenantContactSchema", () => {
  it("accepts a minimal valid contact", () => {
    expect(createTenantContactSchema.safeParse({ name: "Jane Smith" }).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createTenantContactSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      createTenantContactSchema.safeParse({ name: "Jane Smith", email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("accepts the emergency contact flag", () => {
    const result = createTenantContactSchema.parse({ name: "Jane Smith", isEmergencyContact: true });
    expect(result.isEmergencyContact).toBe(true);
  });

  it("treats a blank mobilePhone as absent", () => {
    expect(
      createTenantContactSchema.parse({ name: "Jane Smith", mobilePhone: "" }).mobilePhone,
    ).toBeUndefined();
  });
});

describe("updateTenantContactSchema", () => {
  it("accepts an empty update", () => {
    expect(updateTenantContactSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an active-flag-only update", () => {
    expect(updateTenantContactSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
