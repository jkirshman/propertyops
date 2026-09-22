import { describe, expect, it } from "vitest";

import { PASSWORD_RESET_RATE_LIMITS, hashRateLimitKey } from "./password-reset";
import { isOverRateLimit } from "./rate-limit";

describe("isOverRateLimit", () => {
  it("allows requests until the prior count reaches the max", () => {
    expect(isOverRateLimit(0, 3)).toBe(false);
    expect(isOverRateLimit(2, 3)).toBe(false);
    expect(isOverRateLimit(3, 3)).toBe(true);
    expect(isOverRateLimit(10, 3)).toBe(true);
  });
});

describe("password reset rate-limit configuration", () => {
  it("limits per email more tightly than per source IP", () => {
    expect(PASSWORD_RESET_RATE_LIMITS.perEmail.max).toBeLessThan(PASSWORD_RESET_RATE_LIMITS.perIp.max);
    expect(PASSWORD_RESET_RATE_LIMITS.perEmail.action).not.toBe(PASSWORD_RESET_RATE_LIMITS.perIp.action);
  });

  it("buckets on a hash, never the raw email/IP", () => {
    const hash = hashRateLimitKey("203.0.113.7");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203.0.113.7");
    expect(hashRateLimitKey("203.0.113.7")).toBe(hash);
  });
});
