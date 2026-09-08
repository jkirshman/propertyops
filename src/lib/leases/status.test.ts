import { describe, expect, it } from "vitest";

import { getEffectiveLeaseStatus } from "./status";

describe("getEffectiveLeaseStatus", () => {
  const today = "2026-09-08";

  it("returns draft as-is regardless of dates", () => {
    expect(getEffectiveLeaseStatus("draft", "2020-01-01", "2020-12-31", today)).toBe("draft");
    expect(getEffectiveLeaseStatus("draft", "2030-01-01", null, today)).toBe("draft");
  });

  it("returns terminated as-is regardless of dates", () => {
    expect(getEffectiveLeaseStatus("terminated", "2020-01-01", "2030-12-31", today)).toBe("terminated");
  });

  it("returns month_to_month as-is even past its nominal end date", () => {
    expect(getEffectiveLeaseStatus("month_to_month", "2020-01-01", "2021-01-01", today)).toBe(
      "month_to_month",
    );
  });

  it("derives upcoming when the start date is in the future", () => {
    expect(getEffectiveLeaseStatus("active", "2026-10-01", "2027-10-01", today)).toBe("upcoming");
  });

  it("derives active when today is within the lease term", () => {
    expect(getEffectiveLeaseStatus("active", "2026-01-01", "2027-01-01", today)).toBe("active");
  });

  it("derives active for an open-ended lease that has already started", () => {
    expect(getEffectiveLeaseStatus("active", "2026-01-01", null, today)).toBe("active");
  });

  it("derives expired when the end date has passed", () => {
    expect(getEffectiveLeaseStatus("active", "2025-01-01", "2026-09-01", today)).toBe("expired");
  });

  it("treats the start date and end date as inclusive boundaries", () => {
    expect(getEffectiveLeaseStatus("active", today, "2027-01-01", today)).toBe("active");
    expect(getEffectiveLeaseStatus("active", "2026-01-01", today, today)).toBe("active");
  });
});
