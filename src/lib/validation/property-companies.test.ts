import { describe, expect, it } from "vitest";

import { createPropertyCompanySchema, updatePropertyCompanySchema } from "./property-companies";

describe("createPropertyCompanySchema", () => {
  it("accepts a minimal valid company", () => {
    expect(createPropertyCompanySchema.safeParse({ name: "LAW Asset Group" }).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createPropertyCompanySchema.safeParse({}).success).toBe(false);
  });

  it("treats a blank legal name as absent", () => {
    expect(createPropertyCompanySchema.parse({ name: "Acme", legalName: "" }).legalName).toBeUndefined();
  });
});

describe("updatePropertyCompanySchema", () => {
  it("accepts an empty update", () => {
    expect(updatePropertyCompanySchema.safeParse({}).success).toBe(true);
  });

  it("accepts an explicit null to clear the legal name", () => {
    expect(updatePropertyCompanySchema.parse({ legalName: null }).legalName).toBeNull();
  });

  it("accepts an active-flag-only update", () => {
    expect(updatePropertyCompanySchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
