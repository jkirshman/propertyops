import { describe, expect, it } from "vitest";

import { getLeaseDateOrderingIssues } from "./date-ordering";

describe("getLeaseDateOrderingIssues", () => {
  it("returns no issues for a fully valid, ordered set of dates", () => {
    expect(
      getLeaseDateOrderingIssues({
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        moveInDate: "2026-01-01",
        moveOutDate: "2026-12-31",
      }),
    ).toEqual([]);
  });

  it("flags an end date before the start date", () => {
    const issues = getLeaseDateOrderingIssues({ startDate: "2026-06-01", endDate: "2026-01-01" });
    expect(issues).toEqual([{ field: "endDate", message: "End date cannot be before the start date." }]);
  });

  it("allows the end date to equal the start date", () => {
    expect(getLeaseDateOrderingIssues({ startDate: "2026-06-01", endDate: "2026-06-01" })).toEqual([]);
  });

  it("flags a move-out date before the move-in date", () => {
    const issues = getLeaseDateOrderingIssues({ moveInDate: "2026-06-01", moveOutDate: "2026-01-01" });
    expect(issues).toEqual([
      { field: "moveOutDate", message: "Move-out date cannot be before the move-in date." },
    ]);
  });

  it("reports both issues when both are wrong", () => {
    const issues = getLeaseDateOrderingIssues({
      startDate: "2026-06-01",
      endDate: "2026-01-01",
      moveInDate: "2026-06-01",
      moveOutDate: "2026-01-01",
    });
    expect(issues).toHaveLength(2);
  });

  it("skips checks when a relevant date is missing", () => {
    expect(getLeaseDateOrderingIssues({ startDate: "2026-06-01" })).toEqual([]);
    expect(getLeaseDateOrderingIssues({ moveInDate: "2026-06-01" })).toEqual([]);
    expect(getLeaseDateOrderingIssues({})).toEqual([]);
  });
});
