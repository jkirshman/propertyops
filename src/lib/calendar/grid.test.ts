import { describe, expect, it } from "vitest";

import { addDaysToDateString, addMonths, getMonthGridDays, getMonthGridRange } from "./grid";

describe("getMonthGridDays", () => {
  it("returns a 42-day grid starting on a Sunday", () => {
    // September 2026 starts on a Tuesday.
    const days = getMonthGridDays(2026, 8);
    expect(days).toHaveLength(42);
    expect(days[0].date).toBe("2026-08-30");
    expect(new Date(`${days[0].date}T00:00:00.000Z`).getUTCDay()).toBe(0);
  });

  it("flags days outside the current month", () => {
    const days = getMonthGridDays(2026, 8);
    expect(days[0].inCurrentMonth).toBe(false);
    expect(days.find((day) => day.date === "2026-09-15")?.inCurrentMonth).toBe(true);
  });
});

describe("getMonthGridRange", () => {
  it("spans the full displayed grid, not just the calendar month", () => {
    const range = getMonthGridRange(2026, 8);
    expect(range.start).toBe("2026-08-30");
    expect(range.end).toBe("2026-10-10");
  });
});

describe("addDaysToDateString", () => {
  it("adds days across a month boundary", () => {
    expect(addDaysToDateString("2026-09-25", 10)).toBe("2026-10-05");
  });
});

describe("addMonths", () => {
  it("rolls over into the next year", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("rolls back into the previous year", () => {
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});
