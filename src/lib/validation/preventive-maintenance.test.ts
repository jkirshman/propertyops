import { describe, expect, it } from "vitest";

import {
  createPreventiveMaintenancePlanSchema,
  updatePreventiveMaintenancePlanSchema,
} from "./preventive-maintenance";

const VALID = {
  propertyId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
  categoryId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5679",
  name: "Quarterly HVAC filter change",
  intervalUnit: "month",
  intervalValue: 3,
  nextDueAt: "2026-10-01",
};

describe("createPreventiveMaintenancePlanSchema", () => {
  it("accepts a minimal valid plan", () => {
    expect(createPreventiveMaintenancePlanSchema.safeParse(VALID).success).toBe(true);
  });

  it("defaults priority to normal", () => {
    expect(createPreventiveMaintenancePlanSchema.parse(VALID).defaultPriority).toBe("normal");
  });

  it("rejects a missing property", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.propertyId;
    expect(createPreventiveMaintenancePlanSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a missing name", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.name;
    expect(createPreventiveMaintenancePlanSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an invalid interval unit", () => {
    expect(
      createPreventiveMaintenancePlanSchema.safeParse({ ...VALID, intervalUnit: "day" }).success,
    ).toBe(false);
  });

  it("rejects a zero interval value", () => {
    expect(
      createPreventiveMaintenancePlanSchema.safeParse({ ...VALID, intervalValue: 0 }).success,
    ).toBe(false);
  });

  it("rejects a malformed due date", () => {
    expect(
      createPreventiveMaintenancePlanSchema.safeParse({ ...VALID, nextDueAt: "10/01/2026" })
        .success,
    ).toBe(false);
  });

  it("treats a blank equipment id as absent", () => {
    const result = createPreventiveMaintenancePlanSchema.parse({
      ...VALID,
      propertyEquipmentId: "",
    });
    expect(result.propertyEquipmentId).toBeUndefined();
  });
});

describe("updatePreventiveMaintenancePlanSchema", () => {
  it("accepts an empty update", () => {
    expect(updatePreventiveMaintenancePlanSchema.safeParse({}).success).toBe(true);
  });

  it("accepts an active-flag-only update", () => {
    expect(updatePreventiveMaintenancePlanSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("accepts an explicit null to unlink equipment", () => {
    const result = updatePreventiveMaintenancePlanSchema.parse({ propertyEquipmentId: null });
    expect(result.propertyEquipmentId).toBeNull();
  });

  it("accepts an explicit null to clear the default assignee", () => {
    const result = updatePreventiveMaintenancePlanSchema.parse({ defaultAssigneeUserId: null });
    expect(result.defaultAssigneeUserId).toBeNull();
  });

  it("rejects an invalid priority", () => {
    expect(
      updatePreventiveMaintenancePlanSchema.safeParse({ defaultPriority: "critical" }).success,
    ).toBe(false);
  });
});
