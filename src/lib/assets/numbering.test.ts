import { describe, expect, it } from "vitest";

import { formatAssetTag } from "./numbering";

describe("formatAssetTag", () => {
  it("zero-pads to six digits", () => {
    expect(formatAssetTag(1)).toBe("ASSET-000001");
  });

  it("does not truncate numbers longer than six digits", () => {
    expect(formatAssetTag(1234567)).toBe("ASSET-1234567");
  });

  it("formats a mid-range number", () => {
    expect(formatAssetTag(42)).toBe("ASSET-000042");
  });
});
