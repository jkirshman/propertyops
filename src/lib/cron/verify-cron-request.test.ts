import { describe, expect, it } from "vitest";

import { verifyCronSecret } from "./verify-cron-request";

describe("verifyCronSecret", () => {
  it("accepts a matching secret", () => {
    expect(verifyCronSecret("correct-secret", "correct-secret")).toBe(true);
  });

  it("rejects a mismatched secret", () => {
    expect(verifyCronSecret("wrong-secret", "correct-secret")).toBe(false);
  });

  it("fails closed when the expected secret is unset", () => {
    expect(verifyCronSecret("anything", undefined)).toBe(false);
    expect(verifyCronSecret("anything", "")).toBe(false);
  });

  it("fails closed when nothing is provided", () => {
    expect(verifyCronSecret(undefined, "correct-secret")).toBe(false);
    expect(verifyCronSecret(null, "correct-secret")).toBe(false);
  });

  it("rejects a provided secret of a different length without throwing", () => {
    expect(verifyCronSecret("short", "a-much-longer-secret-value")).toBe(false);
  });
});
