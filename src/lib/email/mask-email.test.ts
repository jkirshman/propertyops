import { describe, expect, it } from "vitest";

import { maskEmail } from "./mask-email";

describe("maskEmail", () => {
  it("masks all but the first character of the local part", () => {
    expect(maskEmail("admin@example.com")).toBe("a****@example.com");
  });

  it("handles a single-character local part", () => {
    expect(maskEmail("a@example.com")).toBe("a*@example.com");
  });

  it("never reveals the domain", () => {
    const masked = maskEmail("it@michiganpizzahut.com");
    expect(masked.endsWith("@michiganpizzahut.com")).toBe(true);
  });

  it("falls back to a fixed placeholder for malformed input", () => {
    expect(maskEmail("not-an-email")).toBe("***");
  });
});
