import { describe, expect, it } from "vitest";

import {
  createPropertyComponentServiceRecordSchema,
  updatePropertyComponentServiceRecordSchema,
} from "./property-component-service-records";

const VALID = { serviceDate: "2026-09-08", description: "Patched a roof leak near the HVAC curb." };

describe("createPropertyComponentServiceRecordSchema", () => {
  it("accepts a minimal valid record", () => {
    expect(createPropertyComponentServiceRecordSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing service date", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.serviceDate;
    expect(createPropertyComponentServiceRecordSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a malformed service date", () => {
    expect(
      createPropertyComponentServiceRecordSchema.safeParse({ ...VALID, serviceDate: "09/08/2026" }).success,
    ).toBe(false);
  });

  it("rejects a missing description", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.description;
    expect(createPropertyComponentServiceRecordSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a negative cost", () => {
    expect(createPropertyComponentServiceRecordSchema.safeParse({ ...VALID, cost: -10 }).success).toBe(false);
  });

  it("accepts an optional vendor and cost", () => {
    const result = createPropertyComponentServiceRecordSchema.parse({
      ...VALID,
      vendorId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
      cost: 450,
    });
    expect(result.cost).toBe(450);
  });
});

describe("updatePropertyComponentServiceRecordSchema", () => {
  it("accepts an empty update", () => {
    expect(updatePropertyComponentServiceRecordSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a description-only update", () => {
    expect(updatePropertyComponentServiceRecordSchema.safeParse({ description: "Updated" }).success).toBe(true);
  });
});
