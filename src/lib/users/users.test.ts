import { describe, expect, it } from "vitest";

import { buildActivationUrl, shouldInvalidateResetTokensOnUpdate } from "./users";

describe("buildActivationUrl", () => {
  it("builds an absolute URL when an APP_BASE_URL is provided", () => {
    expect(buildActivationUrl("abc123", "https://propertyops.lawassetgroup.com")).toBe(
      "https://propertyops.lawassetgroup.com/activate?token=abc123",
    );
  });

  it("strips a trailing slash from the base URL", () => {
    expect(buildActivationUrl("abc123", "https://example.com/")).toBe("https://example.com/activate?token=abc123");
  });

  it("falls back to a relative path when no base URL is configured", () => {
    expect(buildActivationUrl("abc123", undefined)).toBe("/activate?token=abc123");
  });
});

describe("shouldInvalidateResetTokensOnUpdate", () => {
  it("invalidates reset tokens only when an update deactivates the user", () => {
    expect(shouldInvalidateResetTokensOnUpdate({ isActive: false })).toBe(true);
    expect(shouldInvalidateResetTokensOnUpdate({ isActive: true })).toBe(false);
    expect(shouldInvalidateResetTokensOnUpdate({ displayName: "New name" })).toBe(false);
    expect(shouldInvalidateResetTokensOnUpdate({ roleId: "00000000-0000-0000-0000-000000000000" })).toBe(false);
  });
});
