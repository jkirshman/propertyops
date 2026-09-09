import { describe, expect, it } from "vitest";

import { isNonTerminalWorkOrderStatus, mapWorkOrderStatusToOccurrenceStatus } from "./occurrence-status";

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

describe("isNonTerminalWorkOrderStatus", () => {
  it("treats new/open/in_progress/waiting as non-terminal (still blocking)", () => {
    for (const status of ["new", "open", "in_progress", "waiting"] as const) {
      expect(isNonTerminalWorkOrderStatus(status)).toBe(true);
    }
  });

  it("treats resolved/closed/cancelled as terminal (never blocking)", () => {
    for (const status of ["resolved", "closed", "cancelled"] as const) {
      expect(isNonTerminalWorkOrderStatus(status)).toBe(false);
    }
  });
});
