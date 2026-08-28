import { describe, expect, it } from "vitest";

import {
  createAssetSchema,
  reactivateAssetSchema,
  retireAssetSchema,
  updateAssetSchema,
} from "./assets";

const VALID = {
  displayName: "Dell Latitude 5420",
  categoryId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
};

describe("createAssetSchema", () => {
  it("accepts a minimal valid asset", () => {
    expect(createAssetSchema.safeParse(VALID).success).toBe(true);
  });

  it("defaults status to available and condition to unknown", () => {
    const result = createAssetSchema.parse(VALID);
    expect(result.status).toBe("available");
    expect(result.condition).toBe("unknown");
  });

  it("rejects a missing display name", () => {
    expect(createAssetSchema.safeParse({ categoryId: VALID.categoryId }).success).toBe(false);
  });

  it("rejects a missing category", () => {
    expect(createAssetSchema.safeParse({ displayName: VALID.displayName }).success).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(createAssetSchema.safeParse({ ...VALID, status: "broken" }).success).toBe(false);
  });

  it("rejects an invalid condition", () => {
    expect(createAssetSchema.safeParse({ ...VALID, condition: "excellent" }).success).toBe(false);
  });

  it("rejects a malformed acquired date", () => {
    expect(createAssetSchema.safeParse({ ...VALID, acquiredDate: "01/01/2024" }).success).toBe(false);
  });

  it("rejects a negative purchase cost", () => {
    expect(createAssetSchema.safeParse({ ...VALID, purchaseCost: -1 }).success).toBe(false);
  });
});

describe("updateAssetSchema", () => {
  it("accepts an empty update", () => {
    expect(updateAssetSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a status-only update with retirement fields", () => {
    expect(
      updateAssetSchema.safeParse({
        status: "retired",
        isActive: false,
        retiredDate: "2026-01-01",
        disposalReason: "End of life",
      }).success,
    ).toBe(true);
  });
});

describe("retireAssetSchema", () => {
  it("accepts a retired status with no other fields", () => {
    expect(retireAssetSchema.safeParse({ status: "retired" }).success).toBe(true);
  });

  it("accepts disposed with a disposal reason", () => {
    expect(
      retireAssetSchema.safeParse({ status: "disposed", disposalReason: "Beyond repair" }).success,
    ).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(retireAssetSchema.safeParse({ status: "broken" }).success).toBe(false);
  });
});

describe("reactivateAssetSchema", () => {
  it("accepts an empty body", () => {
    expect(reactivateAssetSchema.safeParse({}).success).toBe(true);
  });
});
