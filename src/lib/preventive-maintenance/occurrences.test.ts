import { describe, expect, it } from "vitest";

import { resolveGenerationGate, type OpenPmWorkOrderInfo } from "./occurrences";

function candidate(status: OpenPmWorkOrderInfo["workOrder"]["status"]): OpenPmWorkOrderInfo {
  return {
    occurrenceId: "occurrence-1",
    workOrder: {
      id: "wo-1",
      number: "WO-0001",
      status,
      assignedUserId: null,
      assigneeName: null,
    },
  };
}

describe("resolveGenerationGate", () => {
  it("does not block when the plan has never generated a Work Order", () => {
    expect(resolveGenerationGate(null, false)).toEqual({ blocked: false });
  });

  it("blocks when the most recent Work Order is still non-terminal", () => {
    for (const status of ["new", "open", "in_progress", "waiting"] as const) {
      const result = resolveGenerationGate(candidate(status), false);
      expect(result.blocked).toBe(true);
      if (result.blocked) {
        expect(result.openWorkOrder.status).toBe(status);
      }
    }
  });

  it("does not block once the most recent Work Order is resolved/closed/cancelled", () => {
    for (const status of ["resolved", "closed", "cancelled"] as const) {
      expect(resolveGenerationGate(candidate(status), false)).toEqual({ blocked: false });
    }
  });

  it("does not block a non-terminal candidate when confirmDuplicate is true", () => {
    expect(resolveGenerationGate(candidate("open"), true)).toEqual({ blocked: false });
  });

  it("still does not block a terminal candidate even when confirmDuplicate is true", () => {
    expect(resolveGenerationGate(candidate("resolved"), true)).toEqual({ blocked: false });
  });
});
