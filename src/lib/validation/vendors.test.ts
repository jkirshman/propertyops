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

  it("produces a clear field error for a missing name", () => {
    const result = createVendorSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain("Vendor name is required.");
    }
  });

  it("produces a clear field error for a blank name", () => {
    const result = createVendorSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain("Vendor name is required.");
    }
  });

  it("rejects an invalid coverage mode", () => {
    expect(createVendorSchema.safeParse({ ...VALID, coverageMode: "regional" }).success).toBe(false);
  });

  it("rejects a malformed compliance date", () => {
    expect(
      createVendorSchema.safeParse({ ...VALID, insuranceExpiresAt: "09/01/2026" }).success,
    ).toBe(false);
  });

  it("produces a friendly (non-technical) message for a malformed compliance date", () => {
    const result = createVendorSchema.safeParse({ ...VALID, insuranceExpiresAt: "09/01/2026" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.flatten().fieldErrors.insuranceExpiresAt?.[0];
      expect(message).toBe("Enter a valid date.");
      expect(message).not.toMatch(/invalid_type|expected string|received/i);
    }
  });

  it("accepts blank compliance dates and normalizes them to undefined", () => {
    const result = createVendorSchema.safeParse({
      ...VALID,
      insuranceExpiresAt: "",
      licenseExpiresAt: "",
      contractExpiresAt: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.insuranceExpiresAt).toBeUndefined();
      expect(result.data.licenseExpiresAt).toBeUndefined();
      expect(result.data.contractExpiresAt).toBeUndefined();
    }
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

  it("produces a clear field error for an invalid email", () => {
    const result = createVendorSchema.safeParse({ ...VALID, primaryEmail: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.primaryEmail).toContain("Email address is invalid.");
    }
  });

  it("succeeds with no notes provided (omitted)", () => {
    const result = createVendorSchema.parse(VALID);
    expect(result.notes).toBeUndefined();
  });

  it("succeeds with an empty-string notes value", () => {
    const result = createVendorSchema.parse({ ...VALID, notes: "" });
    expect(result.notes).toBeUndefined();
  });

  it("normalizes whitespace-only notes to absent", () => {
    const result = createVendorSchema.parse({ ...VALID, notes: "   " });
    expect(result.notes).toBeUndefined();
  });

  it("preserves real notes content", () => {
    const result = createVendorSchema.parse({ ...VALID, notes: "Call ahead before arriving." });
    expect(result.notes).toBe("Call ahead before arriving.");
  });

  it("still accepts a fully populated, valid vendor", () => {
    const result = createVendorSchema.safeParse({
      name: "Acme HVAC Services",
      legalName: "Acme HVAC Services LLC",
      isPreferred: true,
      primaryPhone: "555-123-4567",
      primaryEmail: "service@acmehvac.example",
      website: "https://acmehvac.example",
      addressLine1: "123 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62704",
      country: "USA",
      accountNumber: "ACC-1",
      notes: "Reliable, 24/7 emergency line.",
      coverageMode: "all",
      insuranceExpiresAt: "2027-01-01",
      categoryIds: ["5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678"],
    });
    expect(result.success).toBe(true);
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

  it("accepts a blank compliance date and normalizes it to undefined (not an error)", () => {
    const result = updateVendorSchema.safeParse({ insuranceExpiresAt: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.insuranceExpiresAt).toBeUndefined();
    }
  });

  it("accepts blank values for all three optional compliance dates at once", () => {
    const result = updateVendorSchema.safeParse({
      insuranceExpiresAt: "",
      licenseExpiresAt: "",
      contractExpiresAt: "",
    });
    expect(result.success).toBe(true);
  });

  it("produces a friendly (non-technical) message for a malformed compliance date on update", () => {
    const result = updateVendorSchema.safeParse({ insuranceExpiresAt: "not-a-date" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.flatten().fieldErrors.insuranceExpiresAt?.[0];
      expect(message).toBe("Enter a valid date.");
      expect(message).not.toMatch(/invalid_type|expected string|received/i);
    }
  });

  it("accepts an explicit null to clear notes", () => {
    const result = updateVendorSchema.parse({ notes: null });
    expect(result.notes).toBeNull();
  });

  it("normalizes whitespace-only notes to absent", () => {
    const result = updateVendorSchema.parse({ notes: "   " });
    expect(result.notes).toBeUndefined();
  });

  it("produces a clear field error for an invalid email", () => {
    const result = updateVendorSchema.safeParse({ primaryEmail: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.primaryEmail).toContain("Email address is invalid.");
    }
  });

  it("produces a clear field error for a blank name", () => {
    const result = updateVendorSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain("Vendor name is required.");
    }
  });
});
