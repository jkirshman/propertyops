import { describe, expect, it } from "vitest";

import { classifyDueState, computeNextDueDate } from "./recurrence";

describe("computeNextDueDate", () => {
  it("adds weeks", () => {
    expect(computeNextDueDate("2026-09-08", "week", 1)).toBe("2026-09-15");
  });

  it("adds a custom number of weeks", () => {
    expect(computeNextDueDate("2026-09-08", "week", 2)).toBe("2026-09-22");
  });

  it("adds a single month, preserving day-of-month", () => {
    expect(computeNextDueDate("2026-01-01", "month", 1)).toBe("2026-02-01");
  });

  it("adds quarters", () => {
    expect(computeNextDueDate("2026-01-15", "month", 3)).toBe("2026-04-15");
  });

  it("adds a year", () => {
    expect(computeNextDueDate("2026-03-10", "month", 12)).toBe("2027-03-10");
  });

  it("clamps to the last day of a shorter month (Jan 31 + 1 month, non-leap year)", () => {
    expect(computeNextDueDate("2026-01-31", "month", 1)).toBe("2026-02-28");
  });

  it("clamps to Feb 29 in a leap year", () => {
    expect(computeNextDueDate("2024-01-31", "month", 1)).toBe("2024-02-29");
  });

  it("clamps correctly when adding multiple months from a month-end date", () => {
    expect(computeNextDueDate("2026-01-31", "month", 3)).toBe("2026-04-30");
  });

  it("rolls a leap-day anchor forward to Feb 28 in a non-leap year", () => {
    expect(computeNextDueDate("2024-02-29", "month", 12)).toBe("2025-02-28");
  });

  it("rolls over into the next year", () => {
    expect(computeNextDueDate("2026-11-30", "month", 3)).toBe("2027-02-28");
  });

  it("preserves cadence even when computed from a late/overdue due date rather than today", () => {
    // A plan due on the 1st stays anchored to the 1st regardless of when it
    // actually gets generated or completed.
    expect(computeNextDueDate("2026-09-01", "month", 1)).toBe("2026-10-01");
  });

  it("rejects a non-positive interval value", () => {
    expect(() => computeNextDueDate("2026-01-01", "month", 0)).toThrow();
  });
});

describe("classifyDueState", () => {
  const today = "2026-09-08";

  it("classifies a past due date as overdue", () => {
    expect(classifyDueState("2026-09-01", today)).toBe("overdue");
  });

  it("classifies today as due soon, not overdue", () => {
    expect(classifyDueState("2026-09-08", today)).toBe("due_soon");
  });

  it("classifies a date within the threshold as due soon", () => {
    expect(classifyDueState("2026-09-20", today)).toBe("due_soon");
  });

  it("classifies a date right at the threshold boundary as due soon", () => {
    expect(classifyDueState("2026-09-22", today)).toBe("due_soon");
  });

  it("classifies a date just past the threshold as upcoming", () => {
    expect(classifyDueState("2026-09-23", today)).toBe("upcoming");
  });

  it("classifies a far-future date as upcoming", () => {
    expect(classifyDueState("2027-01-01", today)).toBe("upcoming");
  });

  it("respects a custom due-soon threshold", () => {
    expect(classifyDueState("2026-09-10", today, 1)).toBe("upcoming");
  });
});
