import { describe, expect, it } from "vitest";

import { clampHistoryLimit } from "./history";

describe("clampHistoryLimit", () => {
  it("defaults to 50 when not provided", () => {
    expect(clampHistoryLimit(undefined)).toBe(50);
  });

  it("defaults to 50 for a zero or negative value", () => {
    expect(clampHistoryLimit(0)).toBe(50);
    expect(clampHistoryLimit(-5)).toBe(50);
  });

  it("defaults to 50 for a non-finite value", () => {
    expect(clampHistoryLimit(Number.NaN)).toBe(50);
    expect(clampHistoryLimit(Number.POSITIVE_INFINITY)).toBe(50);
  });

  it("passes through a value within range", () => {
    expect(clampHistoryLimit(75)).toBe(75);
  });

  it("caps at 200", () => {
    expect(clampHistoryLimit(10000)).toBe(200);
  });

  it("floors a fractional value", () => {
    expect(clampHistoryLimit(10.9)).toBe(10);
  });
});
