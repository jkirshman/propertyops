import { describe, expect, it } from "vitest";

import { calculateOverallResult } from "./result";

describe("calculateOverallResult", () => {
  it("returns passed when there are no failures", () => {
    expect(
      calculateOverallResult([
        { itemRequired: true, outcome: "pass" },
        { itemRequired: false, outcome: "pass" },
        { itemRequired: true, outcome: null },
      ]),
    ).toBe("passed");
  });

  it("returns passed when there are no pass_fail items at all", () => {
    expect(calculateOverallResult([{ itemRequired: true, outcome: null }])).toBe("passed");
  });

  it("returns failed when a required item fails", () => {
    expect(
      calculateOverallResult([
        { itemRequired: true, outcome: "fail" },
        { itemRequired: false, outcome: "pass" },
      ]),
    ).toBe("failed");
  });

  it("returns passed_with_findings when only a non-required item fails", () => {
    expect(
      calculateOverallResult([
        { itemRequired: true, outcome: "pass" },
        { itemRequired: false, outcome: "fail" },
      ]),
    ).toBe("passed_with_findings");
  });

  it("prioritizes failed over passed_with_findings when both required and optional items fail", () => {
    expect(
      calculateOverallResult([
        { itemRequired: true, outcome: "fail" },
        { itemRequired: false, outcome: "fail" },
      ]),
    ).toBe("failed");
  });

  it("returns passed for an empty response list", () => {
    expect(calculateOverallResult([])).toBe("passed");
  });
});
