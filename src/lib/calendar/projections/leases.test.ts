import { describe, expect, it } from "vitest";

import { projectLeaseMilestones, type LeaseCalendarRow } from "./leases";

const TODAY = "2026-09-08";

const BASE: LeaseCalendarRow = {
  id: "lease-1",
  organizationId: "org-1",
  propertyId: "prop-1",
  label: "Acme Co — Suite 4",
  startDate: "2026-01-01",
  endDate: null,
  noticeDate: null,
  renewalOptionDate: null,
  moveInDate: null,
  moveOutDate: null,
};

describe("projectLeaseMilestones", () => {
  it("projects only the milestones that are actually present", () => {
    const events = projectLeaseMilestones(BASE, TODAY);
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe("lease_start");
  });

  it("projects one distinct event per populated milestone field", () => {
    const events = projectLeaseMilestones(
      {
        ...BASE,
        endDate: "2027-01-01",
        noticeDate: "2026-10-01",
        renewalOptionDate: "2026-11-01",
        moveInDate: "2026-01-05",
        moveOutDate: "2026-12-31",
      },
      TODAY,
    );
    expect(events).toHaveLength(6);
    expect(new Set(events.map((event) => event.category)).size).toBe(6);
    expect(events.every((event) => event.deepLinkUrl === "/leases/lease-1")).toBe(true);
    expect(events.every((event) => event.allDay)).toBe(true);
  });

  it("flags a past milestone date as overdue", () => {
    const events = projectLeaseMilestones({ ...BASE, startDate: "2025-01-01" }, TODAY);
    expect(events[0].overdue).toBe(true);
  });
});
