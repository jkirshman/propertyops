import { describe, expect, it } from "vitest";

import { resolveRowClick, type RowClickInput } from "./row-click";

const PLAIN_CLICK: RowClickInput = {
  button: 0,
  defaultPrevented: false,
  targetIsInteractive: false,
  hasTextSelection: false,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
};

describe("resolveRowClick", () => {
  it("navigates on a plain primary-button click on non-interactive row content", () => {
    expect(resolveRowClick(PLAIN_CLICK)).toBe("navigate");
  });

  it("does nothing when the click landed on a nested link/button/control", () => {
    expect(resolveRowClick({ ...PLAIN_CLICK, targetIsInteractive: true })).toBe("none");
  });

  it("does nothing when a nested handler already called preventDefault", () => {
    expect(resolveRowClick({ ...PLAIN_CLICK, defaultPrevented: true })).toBe("none");
  });

  it("does nothing for non-primary buttons", () => {
    expect(resolveRowClick({ ...PLAIN_CLICK, button: 1 })).toBe("none");
    expect(resolveRowClick({ ...PLAIN_CLICK, button: 2 })).toBe("none");
  });

  it("does nothing while the user is selecting text in the row", () => {
    expect(resolveRowClick({ ...PLAIN_CLICK, hasTextSelection: true })).toBe("none");
  });

  it("opens a new tab for modified clicks, matching native link behavior", () => {
    expect(resolveRowClick({ ...PLAIN_CLICK, metaKey: true })).toBe("navigate-new-tab");
    expect(resolveRowClick({ ...PLAIN_CLICK, ctrlKey: true })).toBe("navigate-new-tab");
    expect(resolveRowClick({ ...PLAIN_CLICK, shiftKey: true })).toBe("navigate-new-tab");
  });

  it("never navigates from a nested control even with a modifier held", () => {
    expect(resolveRowClick({ ...PLAIN_CLICK, targetIsInteractive: true, metaKey: true })).toBe("none");
  });
});
