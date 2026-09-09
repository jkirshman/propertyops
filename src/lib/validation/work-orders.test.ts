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

  it("treats a blank propertyEquipmentId as absent", () => {
    const result = createWorkOrderSchema.parse({ ...VALID, propertyEquipmentId: "" });
    expect(result.propertyEquipmentId).toBeUndefined();
  });

  it("accepts an optional propertyEquipmentId", () => {
    const result = createWorkOrderSchema.parse({
      ...VALID,
      propertyEquipmentId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f567a",
    });
    expect(result.propertyEquipmentId).toBe("5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f567a");
  });

  it("treats a blank assetId as absent", () => {
    const result = createWorkOrderSchema.parse({ ...VALID, assetId: "" });
    expect(result.assetId).toBeUndefined();
  });

  it("accepts an optional assetId", () => {
    const result = createWorkOrderSchema.parse({
      ...VALID,
      assetId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f567b",
    });
    expect(result.assetId).toBe("5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f567b");
  });

  it("treats a blank vendorId as absent", () => {
    const result = createWorkOrderSchema.parse({ ...VALID, vendorId: "" });
    expect(result.vendorId).toBeUndefined();
  });

  it("accepts an optional vendorId", () => {
    const result = createWorkOrderSchema.parse({
      ...VALID,
      vendorId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f567c",
    });
    expect(result.vendorId).toBe("5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f567c");
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

  it("accepts an explicit null to unlink equipment", () => {
    const result = updateWorkOrderSchema.parse({ propertyEquipmentId: null });
    expect(result.propertyEquipmentId).toBeNull();
  });

  it("accepts an explicit null to unlink an asset", () => {
    const result = updateWorkOrderSchema.parse({ assetId: null });
    expect(result.assetId).toBeNull();
  });

  it("accepts an explicit null to unassign a vendor", () => {
    const result = updateWorkOrderSchema.parse({ vendorId: null });
    expect(result.vendorId).toBeNull();
  });

  it("accepts a valid scheduled start/end pair", () => {
    expect(
      updateWorkOrderSchema.safeParse({
        scheduledStartAt: "2026-09-10T14:00:00.000Z",
        scheduledEndAt: "2026-09-10T15:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects a scheduled end before the scheduled start", () => {
    const result = updateWorkOrderSchema.safeParse({
      scheduledStartAt: "2026-09-10T15:00:00.000Z",
      scheduledEndAt: "2026-09-10T14:00:00.000Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.scheduledEndAt).toBeTruthy();
    }
  });

  it("accepts an explicit null to clear scheduling", () => {
    const result = updateWorkOrderSchema.parse({ scheduledStartAt: null, scheduledEndAt: null });
    expect(result.scheduledStartAt).toBeNull();
    expect(result.scheduledEndAt).toBeNull();
  });
});
