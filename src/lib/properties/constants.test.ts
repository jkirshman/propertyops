import { describe, expect, it } from "vitest";

import {
  CONTACT_TYPES,
  CONTACT_TYPE_LABELS,
  OCCUPANCY_MODELS,
  OCCUPANCY_MODEL_LABELS,
} from "./constants";

describe("property constants", () => {
  it("has a label for every occupancy model", () => {
    for (const model of OCCUPANCY_MODELS) {
      expect(OCCUPANCY_MODEL_LABELS[model]).toBeTruthy();
    }
  });

  it("has a label for every contact type", () => {
    for (const type of CONTACT_TYPES) {
      expect(CONTACT_TYPE_LABELS[type]).toBeTruthy();
    }
  });
});
