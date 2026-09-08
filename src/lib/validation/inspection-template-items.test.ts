import { describe, expect, it } from "vitest";

import {
  createInspectionTemplateItemSchema,
  updateInspectionTemplateItemSchema,
} from "./inspection-template-items";

const VALID = { label: "Smoke detectors present", responseType: "pass_fail" as const };

describe("createInspectionTemplateItemSchema", () => {
  it("accepts a minimal valid pass/fail item", () => {
    expect(createInspectionTemplateItemSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing label", () => {
    expect(
      createInspectionTemplateItemSchema.safeParse({ responseType: "pass_fail" }).success,
    ).toBe(false);
  });

  it("rejects an unknown response type", () => {
    expect(
      createInspectionTemplateItemSchema.safeParse({ ...VALID, responseType: "essay" }).success,
    ).toBe(false);
  });

  it("rejects a choice item with no choices", () => {
    const result = createInspectionTemplateItemSchema.safeParse({
      label: "Exterior paint color",
      responseType: "choice",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a choice item with only one choice", () => {
    const result = createInspectionTemplateItemSchema.safeParse({
      label: "Exterior paint color",
      responseType: "choice",
      choices: ["White"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a choice item with at least two choices", () => {
    const result = createInspectionTemplateItemSchema.safeParse({
      label: "Exterior paint color",
      responseType: "choice",
      choices: ["White", "Beige", "Gray"],
    });
    expect(result.success).toBe(true);
  });

  it("does not require choices for non-choice types", () => {
    expect(createInspectionTemplateItemSchema.safeParse({ ...VALID }).success).toBe(true);
  });
});

describe("updateInspectionTemplateItemSchema", () => {
  it("accepts an empty update", () => {
    expect(updateInspectionTemplateItemSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a required-flag-only update", () => {
    expect(updateInspectionTemplateItemSchema.safeParse({ isRequired: false }).success).toBe(true);
  });

  it("rejects switching to choice type without providing choices", () => {
    expect(
      updateInspectionTemplateItemSchema.safeParse({ responseType: "choice" }).success,
    ).toBe(false);
  });
});
