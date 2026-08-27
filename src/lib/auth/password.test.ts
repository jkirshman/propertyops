import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("generates a unique salt per call", async () => {
    const a = await hashPassword("correct horse battery staple");
    const b = await hashPassword("correct horse battery staple");

    expect(a.salt).not.toEqual(b.salt);
    expect(a.hash).not.toEqual(b.hash);
  });

  it("verifies a correct password", async () => {
    const { salt, hash } = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", salt, hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const { salt, hash } = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", salt, hash)).resolves.toBe(false);
  });

  it("rejects a tampered hash", async () => {
    const { salt, hash } = await hashPassword("correct horse battery staple");
    const tampered = hash.slice(0, -2) + (hash.slice(-2) === "00" ? "11" : "00");
    await expect(verifyPassword("correct horse battery staple", salt, tampered)).resolves.toBe(
      false,
    );
  });
});
