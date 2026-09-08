import { describe, expect, it } from "vitest";

import { canCompleteInspection, getIncompleteRequiredResponses } from "./completion";

function response(overrides: Partial<Parameters<typeof getIncompleteRequiredResponses>[0][number]>) {
  return {
    id: "r1",
    itemLabel: "Smoke detectors present",
    itemRequired: true,
    itemResponseType: "pass_fail",
    value: null,
    outcome: null,
    ...overrides,
  };
}

describe("getIncompleteRequiredResponses / canCompleteInspection", () => {
  it("flags a required pass_fail item with no outcome as incomplete", () => {
    const responses = [response({})];
    expect(getIncompleteRequiredResponses(responses)).toHaveLength(1);
    expect(canCompleteInspection(responses)).toBe(false);
  });

  it("treats a required pass_fail item with an outcome as complete", () => {
    const responses = [response({ outcome: "pass" })];
    expect(getIncompleteRequiredResponses(responses)).toHaveLength(0);
    expect(canCompleteInspection(responses)).toBe(true);
  });

  it("flags a required text item with a blank value as incomplete", () => {
    const responses = [response({ itemResponseType: "text", value: "   " })];
    expect(canCompleteInspection(responses)).toBe(false);
  });

  it("treats a required text item with a real value as complete", () => {
    const responses = [response({ itemResponseType: "text", value: "Looks fine" })];
    expect(canCompleteInspection(responses)).toBe(true);
  });

  it("ignores non-required items entirely", () => {
    const responses = [response({ itemRequired: false, outcome: null, value: null })];
    expect(canCompleteInspection(responses)).toBe(true);
  });

  it("is complete for an empty checklist", () => {
    expect(canCompleteInspection([])).toBe(true);
  });

  it("returns every incomplete required item, not just the first", () => {
    const responses = [
      response({ id: "a" }),
      response({ id: "b", itemResponseType: "numeric", value: null }),
      response({ id: "c", outcome: "fail" }),
    ];
    const incomplete = getIncompleteRequiredResponses(responses);
    expect(incomplete.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
