import { describe, expect, it } from "vitest";

import { createPropertyNoteSchema } from "./property-notes";

describe("createPropertyNoteSchema", () => {
  it("accepts a valid note", () => {
    expect(createPropertyNoteSchema.safeParse({ body: "Called the tenant." }).success).toBe(true);
  });

  it("rejects an empty note", () => {
    expect(createPropertyNoteSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a note that is only whitespace", () => {
    expect(createPropertyNoteSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("rejects a note over the length limit", () => {
    expect(createPropertyNoteSchema.safeParse({ body: "a".repeat(4001) }).success).toBe(false);
  });
});
