import { describe, expect, it } from "vitest";

import { createLeaseSchema, updateLeaseSchema } from "./leases";

const VALID = {
  propertyId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
  tenantId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5679",
  label: "Unit 4B",
  startDate: "2026-01-01",
};

describe("createLeaseSchema", () => {
  it("accepts a minimal valid lease", () => {
    expect(createLeaseSchema.safeParse(VALID).success).toBe(true);
  });

  it("defaults leaseType to residential and status to draft", () => {
    const result = createLeaseSchema.parse(VALID);
    expect(result.leaseType).toBe("residential");
    expect(result.status).toBe("draft");
  });

  it("rejects a missing property", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.propertyId;
    expect(createLeaseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a missing tenant", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.tenantId;
    expect(createLeaseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a missing start date", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.startDate;
    expect(createLeaseSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const result = createLeaseSchema.safeParse({ ...VALID, endDate: "2025-01-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endDate?.[0]).toBe(
        "End date cannot be before the start date.",
      );
    }
  });

  it("accepts an end date on or after the start date", () => {
    expect(createLeaseSchema.safeParse({ ...VALID, endDate: "2026-01-01" }).success).toBe(true);
    expect(createLeaseSchema.safeParse({ ...VALID, endDate: "2027-01-01" }).success).toBe(true);
  });

  it("rejects a move-out date before the move-in date", () => {
    const result = createLeaseSchema.safeParse({
      ...VALID,
      moveInDate: "2026-06-01",
      moveOutDate: "2026-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.moveOutDate?.[0]).toBe(
        "Move-out date cannot be before the move-in date.",
      );
    }
  });

  it("succeeds with no optional dates or money fields at all", () => {
    const result = createLeaseSchema.parse(VALID);
    expect(result.endDate).toBeUndefined();
    expect(result.baseRent).toBeUndefined();
    expect(result.securityDeposit).toBeUndefined();
  });

  it("normalizes blank money fields to absent rather than erroring", () => {
    const result = createLeaseSchema.safeParse({ ...VALID, baseRent: "" as unknown as number });
    expect(result.success).toBe(true);
  });

  it("rejects a negative rent amount", () => {
    expect(createLeaseSchema.safeParse({ ...VALID, baseRent: -100 }).success).toBe(false);
  });

  it("accepts a valid rent amount", () => {
    const result = createLeaseSchema.parse({ ...VALID, baseRent: 1500.5 });
    expect(result.baseRent).toBe(1500.5);
  });

  it("rejects an unknown rent frequency", () => {
    expect(createLeaseSchema.safeParse({ ...VALID, rentFrequency: "biweekly" }).success).toBe(false);
  });
});

describe("updateLeaseSchema", () => {
  it("accepts an empty update", () => {
    expect(updateLeaseSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a status-only update", () => {
    expect(updateLeaseSchema.safeParse({ status: "terminated" }).success).toBe(true);
  });

  it("accepts an explicit null to clear the end date", () => {
    expect(updateLeaseSchema.parse({ endDate: null }).endDate).toBeNull();
  });

  it("accepts an explicit null to clear the security deposit", () => {
    expect(updateLeaseSchema.parse({ securityDeposit: null }).securityDeposit).toBeNull();
  });

  it("still catches an end date before a start date when both are provided together", () => {
    const result = updateLeaseSchema.safeParse({ startDate: "2026-06-01", endDate: "2026-01-01" });
    expect(result.success).toBe(false);
  });

  it("does not false-positive on a partial update touching only one date", () => {
    // Cross-field ordering against the *existing* stored dates is the API
    // route's job (see getLeaseDateOrderingIssues) when only one side is sent.
    expect(updateLeaseSchema.safeParse({ endDate: "2026-01-01" }).success).toBe(true);
  });
});
