import { describe, expect, it } from "vitest";

import { loginSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a valid login and normalizes the email", () => {
    const result = loginSchema.parse({
      email: "  Admin@Example.com  ",
      password: "supersecret",
    });

    expect(result.email).toBe("admin@example.com");
    expect(result.password).toBe("supersecret");
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "supersecret" }).success).toBe(
      false,
    );
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(loginSchema.safeParse({ email: "admin@example.com", password: "short" }).success).toBe(
      false,
    );
  });

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });
});
