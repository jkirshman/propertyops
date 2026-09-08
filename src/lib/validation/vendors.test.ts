import { describe, expect, it } from "vitest";

import { createVendorSchema, updateVendorSchema } from "./vendors";

const VALID = { name: "Acme HVAC Services" };

describe("createVendorSchema", () => {
  it("accepts a minimal valid vendor", () => {
    expect(createVendorSchema.safeParse(VALID).success).toBe(true);
  });

  it("defaults coverageMode to all", () => {
    expect(createVendorSchema.parse(VALID).coverageMode).toBe("all");
  });

  it("rejects a missing name", () => {
    expect(createVendorSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an invalid coverage mode", () => {
    expect(createVendorSchema.safeParse({ ...VALID, coverageMode: "regional" }).success).toBe(false);
  });

  it("rejects a malformed compliance date", () => {
    expect(
      createVendorSchema.safeParse({ ...VALID, insuranceExpiresAt: "09/01/2026" }).success,
    ).toBe(false);
  });

  it("treats a blank email as absent", () => {
    const result = createVendorSchema.parse({ ...VALID, primaryEmail: "" });
    expect(result.primaryEmail).toBeUndefined();
  });

  it("rejects an invalid email", () => {
    expect(createVendorSchema.safeParse({ ...VALID, primaryEmail: "not-an-email" }).success).toBe(
      false,
    );
  });

  it("accepts category ids", () => {
    const result = createVendorSchema.parse({
      ...VALID,
      categoryIds: ["5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678"],
    });
    expect(result.categoryIds).toHaveLength(1);
  });
});

describe("updateVendorSchema", () => {
  it("accepts an empty update", () => {
    expect(updateVendorSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a preferred-flag-only update", () => {
    expect(updateVendorSchema.safeParse({ isPreferred: true }).success).toBe(true);
  });

  it("accepts an explicit null to clear legal name", () => {
    const result = updateVendorSchema.parse({ legalName: null });
    expect(result.legalName).toBeNull();
  });

  it("accepts an explicit null to clear a compliance date", () => {
    const result = updateVendorSchema.parse({ insuranceExpiresAt: null });
    expect(result.insuranceExpiresAt).toBeNull();
  });
});
