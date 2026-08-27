import { describe, expect, it } from "vitest";

import { computeStatusTimestampUpdates } from "./status-transitions";

describe("computeStatusTimestampUpdates", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("stamps resolvedAt when moving to resolved", () => {
    expect(computeStatusTimestampUpdates("resolved", now)).toEqual({ resolvedAt: now });
  });

  it("stamps closedAt when moving to closed", () => {
    expect(computeStatusTimestampUpdates("closed", now)).toEqual({ closedAt: now });
  });

  it("stamps nothing for other statuses", () => {
    for (const status of ["new", "open", "in_progress", "waiting", "cancelled"] as const) {
      expect(computeStatusTimestampUpdates(status, now)).toEqual({});
    }
  });
});
