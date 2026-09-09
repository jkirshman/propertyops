import { describe, expect, it } from "vitest";

import { buildActivationUrl } from "./users";

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
