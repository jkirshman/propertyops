import { describe, expect, it } from "vitest";

import { projectComplianceEvent, type ComplianceCalendarRow } from "./compliance";

const TODAY = "2026-09-08";

const BASE: ComplianceCalendarRow = {
  id: "comp-1",
  organizationId: "org-1",
  propertyId: "prop-1",
  name: "Fire Inspection Certificate",
  expirationDate: null,
};

describe("projectComplianceEvent", () => {
  it("returns null for a record with no expiration date", () => {
    expect(projectComplianceEvent(BASE, TODAY)).toBeNull();
  });

  it("projects the true expiration date as an all-day event", () => {
    const event = projectComplianceEvent({ ...BASE, expirationDate: "2026-10-01" }, TODAY)!;
    expect(event.allDay).toBe(true);
    expect(event.startAt).toBe("2026-10-01");
    expect(event.deepLinkUrl).toBe("/properties/prop-1?tab=compliance");
    expect(event.overdue).toBe(false);
  });

  it("flags a past expiration date as overdue and expired", () => {
    const event = projectComplianceEvent({ ...BASE, expirationDate: "2026-01-01" }, TODAY)!;
    expect(event.overdue).toBe(true);
    expect(event.status).toBe("expired");
  });
});
