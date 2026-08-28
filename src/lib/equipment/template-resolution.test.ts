import { describe, expect, it } from "vitest";

import { resolveEquipmentTemplateId } from "./template-resolution";

const TEMPLATE_A = "aaaaaaaa-0000-0000-0000-000000000000";
const TEMPLATE_B = "bbbbbbbb-0000-0000-0000-000000000000";

describe("resolveEquipmentTemplateId", () => {
  it("returns null for 'none' mode regardless of other fields", () => {
    expect(
      resolveEquipmentTemplateId({
        mode: "none",
        propertyEquipmentTemplateId: TEMPLATE_A,
        propertyTypeDefaultTemplateId: TEMPLATE_B,
      }),
    ).toBeNull();
  });

  it("returns the property's own template for 'override' mode", () => {
    expect(
      resolveEquipmentTemplateId({
        mode: "override",
        propertyEquipmentTemplateId: TEMPLATE_A,
        propertyTypeDefaultTemplateId: TEMPLATE_B,
      }),
    ).toBe(TEMPLATE_A);
  });

  it("returns null for 'override' mode when no override template is set", () => {
    expect(
      resolveEquipmentTemplateId({
        mode: "override",
        propertyEquipmentTemplateId: null,
        propertyTypeDefaultTemplateId: TEMPLATE_B,
      }),
    ).toBeNull();
  });

  it("falls back to the property type's default template for 'default' mode", () => {
    expect(
      resolveEquipmentTemplateId({
        mode: "default",
        propertyEquipmentTemplateId: TEMPLATE_A,
        propertyTypeDefaultTemplateId: TEMPLATE_B,
      }),
    ).toBe(TEMPLATE_B);
  });

  it("returns null for 'default' mode when the property type has no default", () => {
    expect(
      resolveEquipmentTemplateId({
        mode: "default",
        propertyEquipmentTemplateId: null,
        propertyTypeDefaultTemplateId: null,
      }),
    ).toBeNull();
  });
});
