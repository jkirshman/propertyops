import { describe, expect, it } from "vitest";

import {
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_SERVICE_TYPES,
  EQUIPMENT_SERVICE_TYPE_LABELS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
  PROPERTY_EQUIPMENT_TEMPLATE_MODES,
  PROPERTY_EQUIPMENT_TEMPLATE_MODE_LABELS,
} from "./constants";

describe("equipment constants", () => {
  it("has a label for every equipment status", () => {
    for (const status of EQUIPMENT_STATUSES) {
      expect(EQUIPMENT_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("has a label for every equipment condition", () => {
    for (const condition of EQUIPMENT_CONDITIONS) {
      expect(EQUIPMENT_CONDITION_LABELS[condition]).toBeTruthy();
    }
  });

  it("has a label for every service type", () => {
    for (const type of EQUIPMENT_SERVICE_TYPES) {
      expect(EQUIPMENT_SERVICE_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it("has a label for every template mode", () => {
    for (const mode of PROPERTY_EQUIPMENT_TEMPLATE_MODES) {
      expect(PROPERTY_EQUIPMENT_TEMPLATE_MODE_LABELS[mode]).toBeTruthy();
    }
  });
});
