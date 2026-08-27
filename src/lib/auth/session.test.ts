import { describe, expect, it } from "vitest";

import { generateSessionToken, hashSessionToken } from "./session";

describe("session tokens", () => {
  it("generates 32-byte (64 hex char) random tokens", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens across calls", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateSessionToken()));
    expect(tokens.size).toBe(20);
  });

  it("hashes tokens deterministically", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("produces different hashes for different tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(hashSessionToken(a)).not.toBe(hashSessionToken(b));
  });
});
