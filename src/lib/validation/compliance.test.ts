import { describe, expect, it } from "vitest";

import { createComplianceRecordSchema, updateComplianceRecordSchema } from "./compliance";

const VALID = {
  propertyId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
  category: "fire_inspection_certificate" as const,
  name: "Annual Fire Inspection",
};

describe("createComplianceRecordSchema", () => {
  it("accepts a minimal valid record", () => {
    expect(createComplianceRecordSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing property", () => {
    expect(
      createComplianceRecordSchema.safeParse({ category: VALID.category, name: VALID.name }).success,
    ).toBe(false);
  });

  it("rejects a missing name", () => {
    expect(
      createComplianceRecordSchema.safeParse({
        propertyId: VALID.propertyId,
        category: VALID.category,
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown category", () => {
    expect(
      createComplianceRecordSchema.safeParse({ ...VALID, category: "made_up_category" }).success,
    ).toBe(false);
  });

  it("succeeds with no expiration date at all (optional)", () => {
    const result = createComplianceRecordSchema.parse(VALID);
    expect(result.expirationDate).toBeUndefined();
  });

  it("accepts a blank expiration date and normalizes it to undefined", () => {
    const result = createComplianceRecordSchema.safeParse({ ...VALID, expirationDate: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expirationDate).toBeUndefined();
    }
  });

  it("rejects a malformed expiration date with a friendly message", () => {
    const result = createComplianceRecordSchema.safeParse({ ...VALID, expirationDate: "13/45/2026" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.flatten().fieldErrors.expirationDate?.[0];
      expect(message).toBe("Enter a valid date.");
      expect(message).not.toMatch(/invalid_type|expected string|received/i);
    }
  });
});

describe("updateComplianceRecordSchema", () => {
  it("accepts an empty update", () => {
    expect(updateComplianceRecordSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an explicit null to clear the expiration date", () => {
    const result = updateComplianceRecordSchema.parse({ expirationDate: null });
    expect(result.expirationDate).toBeNull();
  });

  it("accepts an active-flag-only update", () => {
    expect(updateComplianceRecordSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
