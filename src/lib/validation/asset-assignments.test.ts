import { describe, expect, it } from "vitest";

import { moveAssetSchema, offboardAssetsSchema, onboardAssetsSchema } from "./asset-assignments";

const PERSON_ID = "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678";
const PROPERTY_ID = "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5679";
const ASSET_ID = "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f567a";

describe("moveAssetSchema", () => {
  it("accepts 'unassigned' with no person or property", () => {
    expect(moveAssetSchema.safeParse({ targetType: "unassigned" }).success).toBe(true);
  });

  it("requires a personId when targetType is 'person'", () => {
    expect(moveAssetSchema.safeParse({ targetType: "person" }).success).toBe(false);
  });

  it("accepts 'person' with a personId", () => {
    expect(moveAssetSchema.safeParse({ targetType: "person", personId: PERSON_ID }).success).toBe(
      true,
    );
  });

  it("requires a propertyId when targetType is 'property'", () => {
    expect(moveAssetSchema.safeParse({ targetType: "property" }).success).toBe(false);
  });

  it("accepts 'property' with a propertyId", () => {
    expect(
      moveAssetSchema.safeParse({ targetType: "property", propertyId: PROPERTY_ID }).success,
    ).toBe(true);
  });

  it("rejects an unknown targetType", () => {
    expect(moveAssetSchema.safeParse({ targetType: "warehouse" }).success).toBe(false);
  });
});

describe("onboardAssetsSchema", () => {
  it("requires at least one asset id", () => {
    expect(onboardAssetsSchema.safeParse({ assetIds: [] }).success).toBe(false);
  });

  it("accepts one or more asset ids with an optional note", () => {
    expect(
      onboardAssetsSchema.safeParse({ assetIds: [ASSET_ID], notes: "Day one kit" }).success,
    ).toBe(true);
  });
});

describe("offboardAssetsSchema", () => {
  it("requires at least one action", () => {
    expect(offboardAssetsSchema.safeParse({ actions: [] }).success).toBe(false);
  });

  it("accepts an unassigned return action", () => {
    expect(
      offboardAssetsSchema.safeParse({
        actions: [{ assetId: ASSET_ID, targetType: "unassigned" }],
      }).success,
    ).toBe(true);
  });

  it("requires a propertyId when reassigning to a property", () => {
    expect(
      offboardAssetsSchema.safeParse({
        actions: [{ assetId: ASSET_ID, targetType: "property" }],
      }).success,
    ).toBe(false);
  });

  it("accepts a property reassignment with a propertyId", () => {
    expect(
      offboardAssetsSchema.safeParse({
        actions: [{ assetId: ASSET_ID, targetType: "property", propertyId: PROPERTY_ID }],
      }).success,
    ).toBe(true);
  });
});
