import { describe, expect, it } from "vitest";

import {
  createInspectionSchema,
  updateInspectionResponseSchema,
  updateInspectionSchema,
} from "./inspections";

const VALID = {
  propertyId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
  templateId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5679",
};

describe("createInspectionSchema", () => {
  it("accepts a minimal valid inspection", () => {
    expect(createInspectionSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing property", () => {
    expect(createInspectionSchema.safeParse({ templateId: VALID.templateId }).success).toBe(false);
  });

  it("rejects a missing template", () => {
    expect(createInspectionSchema.safeParse({ propertyId: VALID.propertyId }).success).toBe(false);
  });

  it("treats a blank equipment id as absent", () => {
    const result = createInspectionSchema.parse({ ...VALID, propertyEquipmentId: "" });
    expect(result.propertyEquipmentId).toBeUndefined();
  });

  it("accepts a blank scheduled date as absent (no technical error)", () => {
    const result = createInspectionSchema.safeParse({ ...VALID, scheduledDate: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledDate).toBeUndefined();
    }
  });

  it("rejects a malformed scheduled date with a friendly message", () => {
    const result = createInspectionSchema.safeParse({ ...VALID, scheduledDate: "not-a-date" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.scheduledDate?.[0]).toBe("Enter a valid date.");
    }
  });

  it("rejects a scheduled end before the scheduled start", () => {
    const result = createInspectionSchema.safeParse({
      ...VALID,
      scheduledStartAt: "2026-09-10T15:00:00.000Z",
      scheduledEndAt: "2026-09-10T14:00:00.000Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.scheduledEndAt).toBeTruthy();
    }
  });
});

describe("updateInspectionSchema", () => {
  it("accepts an empty update", () => {
    expect(updateInspectionSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an explicit null to clear the scheduled date", () => {
    const result = updateInspectionSchema.parse({ scheduledDate: null });
    expect(result.scheduledDate).toBeNull();
  });

  it("accepts a cancellation status", () => {
    expect(updateInspectionSchema.safeParse({ status: "cancelled" }).success).toBe(true);
  });

  it("accepts an explicit null to clear scheduling", () => {
    const result = updateInspectionSchema.parse({ scheduledStartAt: null, scheduledEndAt: null });
    expect(result.scheduledStartAt).toBeNull();
    expect(result.scheduledEndAt).toBeNull();
  });
});

describe("updateInspectionResponseSchema", () => {
  it("accepts an empty update", () => {
    expect(updateInspectionResponseSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a pass/fail outcome", () => {
    expect(updateInspectionResponseSchema.safeParse({ outcome: "fail" }).success).toBe(true);
  });

  it("rejects an invalid outcome", () => {
    expect(updateInspectionResponseSchema.safeParse({ outcome: "maybe" }).success).toBe(false);
  });

  it("treats a blank value as absent", () => {
    const result = updateInspectionResponseSchema.parse({ value: "" });
    expect(result.value).toBeUndefined();
  });
});
