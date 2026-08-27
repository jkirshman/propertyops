import { describe, expect, it } from "vitest";

import { createWorkOrderNoteSchema } from "./work-order-notes";

describe("createWorkOrderNoteSchema", () => {
  it("accepts a valid note", () => {
    expect(createWorkOrderNoteSchema.safeParse({ body: "Vendor scheduled for Friday." }).success).toBe(
      true,
    );
  });

  it("rejects an empty note", () => {
    expect(createWorkOrderNoteSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only note", () => {
    expect(createWorkOrderNoteSchema.safeParse({ body: "   " }).success).toBe(false);
  });
});
