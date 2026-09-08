import { describe, expect, it } from "vitest";

import { classifyComplianceRecordStatus } from "./status";

describe("classifyComplianceRecordStatus", () => {
  const today = "2026-09-08";

  it("classifies a missing expiration date as no_expiration", () => {
    expect(classifyComplianceRecordStatus(null, today)).toBe("no_expiration");
  });

  it("classifies a past date as expired", () => {
    expect(classifyComplianceRecordStatus("2026-09-01", today)).toBe("expired");
  });

  it("classifies today as expiring soon, not expired", () => {
    expect(classifyComplianceRecordStatus("2026-09-08", today)).toBe("expiring_soon");
  });

  it("classifies a date within the 30-day threshold as expiring soon", () => {
    expect(classifyComplianceRecordStatus("2026-09-30", today)).toBe("expiring_soon");
  });

  it("classifies a date right at the threshold boundary as expiring soon", () => {
    expect(classifyComplianceRecordStatus("2026-10-08", today)).toBe("expiring_soon");
  });

  it("classifies a date just past the threshold as current", () => {
    expect(classifyComplianceRecordStatus("2026-10-09", today)).toBe("current");
  });

  it("classifies a far-future date as current", () => {
    expect(classifyComplianceRecordStatus("2027-01-01", today)).toBe("current");
  });

  it("respects a custom threshold", () => {
    expect(classifyComplianceRecordStatus("2026-09-10", today, 1)).toBe("current");
  });
});
