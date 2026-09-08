import { describe, expect, it } from "vitest";

import { classifyComplianceStatus } from "./compliance";

describe("classifyComplianceStatus", () => {
  const today = "2026-09-08";

  it("classifies a missing date as none", () => {
    expect(classifyComplianceStatus(null, today)).toBe("none");
  });

  it("classifies a past date as expired", () => {
    expect(classifyComplianceStatus("2026-09-01", today)).toBe("expired");
  });

  it("classifies today as expiring soon, not expired", () => {
    expect(classifyComplianceStatus("2026-09-08", today)).toBe("expiring_soon");
  });

  it("classifies a date within the threshold as expiring soon", () => {
    expect(classifyComplianceStatus("2026-09-30", today)).toBe("expiring_soon");
  });

  it("classifies a date right at the threshold boundary as expiring soon", () => {
    expect(classifyComplianceStatus("2026-10-08", today)).toBe("expiring_soon");
  });

  it("classifies a date just past the threshold as ok", () => {
    expect(classifyComplianceStatus("2026-10-09", today)).toBe("ok");
  });

  it("classifies a far-future date as ok", () => {
    expect(classifyComplianceStatus("2027-01-01", today)).toBe("ok");
  });

  it("respects a custom threshold", () => {
    expect(classifyComplianceStatus("2026-09-10", today, 1)).toBe("ok");
  });
});
