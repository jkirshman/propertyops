import { describe, expect, it } from "vitest";

import { hasCapability } from "./capabilities";

describe("hasCapability", () => {
  it("returns true when the capability is granted", () => {
    expect(hasCapability(["platform.admin", "properties.view"], "platform.admin")).toBe(true);
  });

  it("returns false when the capability is not granted", () => {
    expect(hasCapability(["properties.view"], "platform.admin")).toBe(false);
  });

  it("returns false for an empty grant list", () => {
    expect(hasCapability([], "platform.admin")).toBe(false);
  });
});
