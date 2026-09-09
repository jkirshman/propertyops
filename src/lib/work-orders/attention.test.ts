import { describe, expect, it } from "vitest";

import { isWorkOrderOverdue, isWorkOrderUrgentPriority } from "./attention";

describe("isWorkOrderOverdue", () => {
  const today = "2026-09-08";

  it("is false when opened today", () => {
    expect(isWorkOrderOverdue("2026-09-08", 7, today)).toBe(false);
  });

  it("is false exactly at the threshold", () => {
    expect(isWorkOrderOverdue("2026-09-01", 7, today)).toBe(false);
  });

  it("is true just past the threshold", () => {
    expect(isWorkOrderOverdue("2026-08-31", 7, today)).toBe(true);
  });

  it("accepts a Date object for openedAt", () => {
    expect(isWorkOrderOverdue(new Date("2026-08-01T12:00:00Z"), 7, today)).toBe(true);
  });

  it("respects a custom threshold", () => {
    expect(isWorkOrderOverdue("2026-09-05", 1, today)).toBe(true);
    expect(isWorkOrderOverdue("2026-09-07", 1, today)).toBe(false);
  });
});

describe("isWorkOrderUrgentPriority", () => {
  it("is true for high and urgent", () => {
    expect(isWorkOrderUrgentPriority("high")).toBe(true);
    expect(isWorkOrderUrgentPriority("urgent")).toBe(true);
  });

  it("is false for normal and low", () => {
    expect(isWorkOrderUrgentPriority("normal")).toBe(false);
    expect(isWorkOrderUrgentPriority("low")).toBe(false);
  });
});
