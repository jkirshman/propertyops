import { describe, expect, it } from "vitest";

import {
  createEquipmentServiceRecordSchema,
  updateEquipmentServiceRecordSchema,
} from "./equipment-service-records";

const VALID = {
  serviceDate: "2026-01-15",
  serviceType: "preventive_maintenance",
  summary: "Replaced filter and inspected coils.",
};

describe("createEquipmentServiceRecordSchema", () => {
  it("accepts a minimal valid record", () => {
    expect(createEquipmentServiceRecordSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing summary", () => {
    expect(
      createEquipmentServiceRecordSchema.safeParse({
        serviceDate: VALID.serviceDate,
        serviceType: VALID.serviceType,
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid service type", () => {
    expect(
      createEquipmentServiceRecordSchema.safeParse({ ...VALID, serviceType: "witchcraft" }).success,
    ).toBe(false);
  });

  it("rejects a malformed service date", () => {
    expect(
      createEquipmentServiceRecordSchema.safeParse({ ...VALID, serviceDate: "not-a-date" }).success,
    ).toBe(false);
  });

  it("rejects a negative cost", () => {
    expect(createEquipmentServiceRecordSchema.safeParse({ ...VALID, cost: -5 }).success).toBe(false);
  });

  it("accepts an optional vendor and cost", () => {
    const result = createEquipmentServiceRecordSchema.parse({
      ...VALID,
      vendorName: "Acme HVAC",
      cost: 249.99,
    });
    expect(result.vendorName).toBe("Acme HVAC");
    expect(result.cost).toBe(249.99);
  });
});

describe("updateEquipmentServiceRecordSchema", () => {
  it("accepts an empty update", () => {
    expect(updateEquipmentServiceRecordSchema.safeParse({}).success).toBe(true);
  });
});
