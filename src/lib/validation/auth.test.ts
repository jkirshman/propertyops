import { describe, expect, it } from "vitest";

import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "./auth";

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

describe("forgotPasswordSchema", () => {
  it("normalizes the email", () => {
    expect(forgotPasswordSchema.parse({ email: " User@Example.com " }).email).toBe("user@example.com");
  });
  it("rejects an invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  const token = "a".repeat(64);

  it("accepts a matching password of at least 8 characters", () => {
    expect(resetPasswordSchema.safeParse({ token, password: "longenough", confirmPassword: "longenough" }).success).toBe(
      true,
    );
  });

  it("rejects a confirmation mismatch on the confirmPassword field", () => {
    const result = resetPasswordSchema.safeParse({ token, password: "longenough", confirmPassword: "different1" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.confirmPassword).toBeDefined();
  });

  it("rejects a short password and a missing token", () => {
    expect(resetPasswordSchema.safeParse({ token, password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: "", password: "longenough", confirmPassword: "longenough" }).success,
    ).toBe(false);
  });
});
