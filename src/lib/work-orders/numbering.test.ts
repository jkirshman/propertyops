import { describe, expect, it } from "vitest";

import { formatWorkOrderNumber } from "./numbering";

describe("formatWorkOrderNumber", () => {
  it("zero-pads to six digits", () => {
    expect(formatWorkOrderNumber(1)).toBe("WO-000001");
  });

  it("does not truncate numbers longer than six digits", () => {
    expect(formatWorkOrderNumber(1234567)).toBe("WO-1234567");
  });

  it("formats a mid-range number", () => {
    expect(formatWorkOrderNumber(42)).toBe("WO-000042");
  });
});
