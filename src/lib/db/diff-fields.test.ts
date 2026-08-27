import { describe, expect, it } from "vitest";

import { diffFields } from "./diff-fields";

describe("diffFields", () => {
  it("returns null when nothing changed", () => {
    expect(diffFields({ name: "A", isActive: true }, { name: "A" })).toBeNull();
  });

  it("returns only the changed fields", () => {
    expect(diffFields({ name: "A", isActive: true }, { name: "B" })).toEqual({
      before: { name: "A" },
      after: { name: "B" },
    });
  });

  it("ignores undefined fields in the update", () => {
    expect(diffFields({ name: "A" }, { name: undefined })).toBeNull();
  });

  it("detects a boolean flip", () => {
    expect(diffFields({ isActive: true }, { isActive: false })).toEqual({
      before: { isActive: true },
      after: { isActive: false },
    });
  });
});
