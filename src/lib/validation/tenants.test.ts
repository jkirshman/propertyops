import { describe, expect, it } from "vitest";

import { createTenantSchema, updateTenantSchema } from "./tenants";

const VALID = { name: "Jane Smith" };

describe("createTenantSchema", () => {
  it("accepts a minimal valid tenant", () => {
    expect(createTenantSchema.safeParse(VALID).success).toBe(true);
  });

  it("defaults tenantType to individual", () => {
    expect(createTenantSchema.parse(VALID).tenantType).toBe("individual");
  });

  it("rejects a missing name", () => {
    const result = createTenantSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name?.[0]).toBe("Tenant name is required.");
    }
  });

  it("rejects an invalid email with a friendly message", () => {
    const result = createTenantSchema.safeParse({ ...VALID, primaryEmail: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.primaryEmail?.[0]).toBe("Email address is invalid.");
    }
  });

  it("rejects an unknown tenant type", () => {
    expect(createTenantSchema.safeParse({ ...VALID, tenantType: "trust" }).success).toBe(false);
  });

  it("succeeds with no notes at all", () => {
    expect(createTenantSchema.parse(VALID).notes).toBeUndefined();
  });

  it("normalizes a blank/whitespace notes value to absent", () => {
    expect(createTenantSchema.parse({ ...VALID, notes: "" }).notes).toBeUndefined();
    expect(createTenantSchema.parse({ ...VALID, notes: "   " }).notes).toBeUndefined();
  });
});

describe("updateTenantSchema", () => {
  it("accepts an empty update", () => {
    expect(updateTenantSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an active-flag-only update", () => {
    expect(updateTenantSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("accepts an explicit null to clear legal name", () => {
    expect(updateTenantSchema.parse({ legalName: null }).legalName).toBeNull();
  });

  it("accepts a blank email and normalizes it to undefined (not an error)", () => {
    const result = updateTenantSchema.safeParse({ primaryEmail: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.primaryEmail).toBeUndefined();
    }
  });
});
