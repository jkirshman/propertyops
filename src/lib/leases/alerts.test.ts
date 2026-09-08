import { describe, expect, it } from "vitest";

import { daysUntil, isDateApproaching, isLeaseExpired, isLeaseExpiringWithin } from "./alerts";

describe("daysUntil", () => {
  it("returns 0 for today", () => {
    expect(daysUntil("2026-09-08", "2026-09-08")).toBe(0);
  });

  it("returns a positive count for a future date", () => {
    expect(daysUntil("2026-10-08", "2026-09-08")).toBe(30);
  });

  it("returns a negative count for a past date", () => {
    expect(daysUntil("2026-08-08", "2026-09-08")).toBe(-31);
  });

  it("handles a leap-year February correctly", () => {
    expect(daysUntil("2024-03-01", "2024-02-28")).toBe(2);
  });
});

describe("isLeaseExpired", () => {
  const today = "2026-09-08";

  it("is false with no end date (open-ended lease)", () => {
    expect(isLeaseExpired(null, today)).toBe(false);
  });

  it("is false when the end date is today", () => {
    expect(isLeaseExpired(today, today)).toBe(false);
  });

  it("is true once the end date has passed", () => {
    expect(isLeaseExpired("2026-09-01", today)).toBe(true);
  });

  it("is false for a future end date", () => {
    expect(isLeaseExpired("2027-01-01", today)).toBe(false);
  });
});

describe("isLeaseExpiringWithin", () => {
  const today = "2026-09-08";

  it("is false with no end date", () => {
    expect(isLeaseExpiringWithin(null, 90, today)).toBe(false);
  });

  it("is false once already expired (it's a separate state)", () => {
    expect(isLeaseExpiringWithin("2026-09-01", 90, today)).toBe(false);
  });

  it("is true within the threshold", () => {
    expect(isLeaseExpiringWithin("2026-10-01", 90, today)).toBe(true);
  });

  it("is true exactly at the threshold boundary", () => {
    expect(isLeaseExpiringWithin("2026-12-07", 90, today)).toBe(true);
  });

  it("is false just past the threshold", () => {
    expect(isLeaseExpiringWithin("2026-12-09", 90, today)).toBe(false);
  });
});

describe("isDateApproaching", () => {
  const today = "2026-09-08";

  it("is false with no date", () => {
    expect(isDateApproaching(null, 30, today)).toBe(false);
  });

  it("is true for today", () => {
    expect(isDateApproaching(today, 30, today)).toBe(true);
  });

  it("is true within the threshold", () => {
    expect(isDateApproaching("2026-09-20", 30, today)).toBe(true);
  });

  it("is false once the date has already passed", () => {
    expect(isDateApproaching("2026-09-01", 30, today)).toBe(false);
  });

  it("is false beyond the threshold", () => {
    expect(isDateApproaching("2026-12-01", 30, today)).toBe(false);
  });
});
