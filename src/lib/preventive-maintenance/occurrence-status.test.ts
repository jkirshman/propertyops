import { describe, expect, it } from "vitest";

import { mapWorkOrderStatusToOccurrenceStatus } from "./occurrence-status";

describe("mapWorkOrderStatusToOccurrenceStatus", () => {
  it("maps resolved to completed", () => {
    expect(mapWorkOrderStatusToOccurrenceStatus("resolved")).toBe("completed");
  });

  it("maps closed to completed", () => {
    expect(mapWorkOrderStatusToOccurrenceStatus("closed")).toBe("completed");
  });

  it("maps cancelled to cancelled, never completed", () => {
    expect(mapWorkOrderStatusToOccurrenceStatus("cancelled")).toBe("cancelled");
  });

  it("maps every other status back to generated (reopen)", () => {
    for (const status of ["new", "open", "in_progress", "waiting"] as const) {
      expect(mapWorkOrderStatusToOccurrenceStatus(status)).toBe("generated");
    }
  });
});
