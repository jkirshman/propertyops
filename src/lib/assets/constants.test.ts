import { describe, expect, it } from "vitest";

import {
  ASSET_ASSIGNMENT_TYPES,
  ASSET_ASSIGNMENT_TYPE_LABELS,
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_TERMINAL_STATUSES,
} from "./constants";

describe("asset constants", () => {
  it("has a label for every asset status", () => {
    for (const status of ASSET_STATUSES) {
      expect(ASSET_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("has a label for every asset condition", () => {
    for (const condition of ASSET_CONDITIONS) {
      expect(ASSET_CONDITION_LABELS[condition]).toBeTruthy();
    }
  });

  it("has a label for every assignment type", () => {
    for (const type of ASSET_ASSIGNMENT_TYPES) {
      expect(ASSET_ASSIGNMENT_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it("only treats retired and disposed as terminal", () => {
    expect(ASSET_TERMINAL_STATUSES).toEqual(["retired", "disposed"]);
  });
});
