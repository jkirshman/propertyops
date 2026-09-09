import { describe, expect, it } from "vitest";

import { createOperationalEventSchema, updateOperationalEventSchema } from "./operational-events";

const VALID = {
  title: "Property walkthrough",
  startAt: "2026-09-10T14:00:00.000Z",
};

describe("createOperationalEventSchema", () => {
  it("accepts a minimal valid event", () => {
    expect(createOperationalEventSchema.safeParse(VALID).success).toBe(true);
  });

  it("defaults allDay to false", () => {
    const result = createOperationalEventSchema.parse(VALID);
    expect(result.allDay).toBe(false);
  });

  it("rejects a missing title", () => {
    expect(createOperationalEventSchema.safeParse({ startAt: VALID.startAt }).success).toBe(false);
  });

  it("rejects a missing start", () => {
    expect(createOperationalEventSchema.safeParse({ title: VALID.title }).success).toBe(false);
  });

  it("treats a blank propertyId as absent", () => {
    const result = createOperationalEventSchema.parse({ ...VALID, propertyId: "" });
    expect(result.propertyId).toBeUndefined();
  });

  it("rejects an end before the start", () => {
    const result = createOperationalEventSchema.safeParse({
      ...VALID,
      endAt: "2026-09-10T13:00:00.000Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endAt).toBeTruthy();
    }
  });

  it("accepts an all-day event with a date-only start", () => {
    const result = createOperationalEventSchema.safeParse({
      title: "Utility shutoff",
      startAt: "2026-09-10",
      allDay: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateOperationalEventSchema", () => {
  it("accepts an empty update", () => {
    expect(updateOperationalEventSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a cancellation status", () => {
    expect(updateOperationalEventSchema.safeParse({ status: "cancelled" }).success).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(updateOperationalEventSchema.safeParse({ status: "archived" }).success).toBe(false);
  });

  it("accepts an explicit null to clear the property", () => {
    const result = updateOperationalEventSchema.parse({ propertyId: null });
    expect(result.propertyId).toBeNull();
  });
});
