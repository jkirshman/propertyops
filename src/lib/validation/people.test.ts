import { describe, expect, it } from "vitest";

import { createPersonSchema, updatePersonSchema } from "./people";

const VALID = { firstName: "Jordan", lastName: "Rivera" };

describe("createPersonSchema", () => {
  it("accepts a minimal valid person", () => {
    expect(createPersonSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing first name", () => {
    expect(createPersonSchema.safeParse({ lastName: VALID.lastName }).success).toBe(false);
  });

  it("rejects a missing last name", () => {
    expect(createPersonSchema.safeParse({ firstName: VALID.firstName }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(createPersonSchema.safeParse({ ...VALID, email: "not-an-email" }).success).toBe(false);
  });

  it("treats a blank linkedUserId as absent", () => {
    const result = createPersonSchema.parse({ ...VALID, linkedUserId: "" });
    expect(result.linkedUserId).toBeUndefined();
  });

  it("rejects an invalid linkedUserId", () => {
    expect(createPersonSchema.safeParse({ ...VALID, linkedUserId: "not-a-uuid" }).success).toBe(
      false,
    );
  });
});

describe("updatePersonSchema", () => {
  it("accepts an empty update", () => {
    expect(updatePersonSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an explicit null to unlink a user", () => {
    const result = updatePersonSchema.parse({ linkedUserId: null });
    expect(result.linkedUserId).toBeNull();
  });

  it("accepts deactivation only", () => {
    expect(updatePersonSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
