import { describe, expect, it } from "vitest";

import { getRelatedEntityFileRules } from "./related-entity-rules";

describe("getRelatedEntityFileRules", () => {
  it("returns rules for property", () => {
    expect(getRelatedEntityFileRules("property")).toEqual({
      viewCapability: "property.view",
      manageCapability: "property.manage_documents",
    });
  });

  it("returns rules for work_order", () => {
    expect(getRelatedEntityFileRules("work_order")).toEqual({
      viewCapability: "work_order.view",
      manageCapability: "work_order.manage_attachments",
    });
  });

  it("returns null for an unregistered entity type", () => {
    expect(getRelatedEntityFileRules("equipment")).toBeNull();
  });

  it("returns null when no entity type is given", () => {
    expect(getRelatedEntityFileRules(undefined)).toBeNull();
  });
});
