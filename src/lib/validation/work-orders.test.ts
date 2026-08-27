import { describe, expect, it } from "vitest";

import { createWorkOrderSchema, updateWorkOrderSchema } from "./work-orders";

const VALID = {
  propertyId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
  categoryId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5679",
  subject: "Leaking faucet in unit 4",
};

describe("createWorkOrderSchema", () => {
  it("accepts a minimal valid work order", () => {
    expect(createWorkOrderSchema.safeParse(VALID).success).toBe(true);
  });

  it("defaults priority to normal", () => {
    const result = createWorkOrderSchema.parse(VALID);
    expect(result.priority).toBe("normal");
  });

  it("rejects a missing property", () => {
    expect(
      createWorkOrderSchema.safeParse({ categoryId: VALID.categoryId, subject: VALID.subject })
        .success,
    ).toBe(false);
  });

  it("rejects a missing subject", () => {
    expect(
      createWorkOrderSchema.safeParse({
        propertyId: VALID.propertyId,
        categoryId: VALID.categoryId,
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid priority", () => {
    expect(createWorkOrderSchema.safeParse({ ...VALID, priority: "critical" }).success).toBe(
      false,
    );
  });

  it("treats a blank assignee as absent", () => {
    const result = createWorkOrderSchema.parse({ ...VALID, assignedUserId: "" });
    expect(result.assignedUserId).toBeUndefined();
  });
});

describe("updateWorkOrderSchema", () => {
  it("accepts a status-only update", () => {
    expect(updateWorkOrderSchema.safeParse({ status: "resolved" }).success).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(updateWorkOrderSchema.safeParse({ status: "done" }).success).toBe(false);
  });

  it("accepts an explicit null to unassign", () => {
    const result = updateWorkOrderSchema.parse({ assignedUserId: null });
    expect(result.assignedUserId).toBeNull();
  });

  it("accepts an empty update", () => {
    expect(updateWorkOrderSchema.safeParse({}).success).toBe(true);
  });
});
