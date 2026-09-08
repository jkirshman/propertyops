import { describe, expect, it } from "vitest";

import { buildWorkOrderDraftFromFinding } from "./finding";

describe("buildWorkOrderDraftFromFinding", () => {
  it("builds a subject from the item label", () => {
    const draft = buildWorkOrderDraftFromFinding({
      propertyId: "prop-1",
      propertyEquipmentId: null,
      itemLabel: "Smoke detectors present",
      note: null,
    });
    expect(draft.subject).toBe("Inspection finding: Smoke detectors present");
  });

  it("carries the property and omits equipment when the inspection is property-scoped", () => {
    const draft = buildWorkOrderDraftFromFinding({
      propertyId: "prop-1",
      propertyEquipmentId: null,
      itemLabel: "Handrail secure",
      note: null,
    });
    expect(draft.propertyId).toBe("prop-1");
    expect(draft.propertyEquipmentId).toBeUndefined();
  });

  it("carries equipment when the inspection is equipment-scoped", () => {
    const draft = buildWorkOrderDraftFromFinding({
      propertyId: "prop-1",
      propertyEquipmentId: "equip-1",
      itemLabel: "Filter condition",
      note: null,
    });
    expect(draft.propertyEquipmentId).toBe("equip-1");
  });

  it("copies a non-blank note into the description", () => {
    const draft = buildWorkOrderDraftFromFinding({
      propertyId: "prop-1",
      propertyEquipmentId: null,
      itemLabel: "Fire extinguisher charged",
      note: "Gauge reads empty, needs replacement.",
    });
    expect(draft.description).toBe("Gauge reads empty, needs replacement.");
  });

  it("omits description when the note is blank or missing", () => {
    expect(
      buildWorkOrderDraftFromFinding({
        propertyId: "prop-1",
        propertyEquipmentId: null,
        itemLabel: "Exit signs lit",
        note: null,
      }).description,
    ).toBeUndefined();

    expect(
      buildWorkOrderDraftFromFinding({
        propertyId: "prop-1",
        propertyEquipmentId: null,
        itemLabel: "Exit signs lit",
        note: "   ",
      }).description,
    ).toBeUndefined();
  });
});
