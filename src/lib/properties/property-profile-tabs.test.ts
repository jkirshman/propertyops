import { describe, expect, it } from "vitest";

import { parseTab, TABS } from "./property-profile-tabs";

describe("TABS", () => {
  it("is a plain array of tab keys", () => {
    expect(Array.isArray(TABS)).toBe(true);
    expect(TABS).toContain("overview");
    expect(TABS).toContain("compliance");
  });
});

describe("parseTab", () => {
  it("returns the value for a valid tab", () => {
    expect(parseTab("equipment")).toBe("equipment");
  });

  it("returns the value for the compliance tab", () => {
    expect(parseTab("compliance")).toBe("compliance");
  });

  it("returns undefined for an invalid tab value", () => {
    expect(parseTab("not-a-real-tab")).toBeUndefined();
  });

  it("returns undefined when the tab is missing", () => {
    expect(parseTab(undefined)).toBeUndefined();
  });
});
