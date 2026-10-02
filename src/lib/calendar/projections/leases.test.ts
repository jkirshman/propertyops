import { describe, expect, it } from "vitest";

import { isLeaseMilestoneOverdue, projectLeaseMilestones, type LeaseCalendarRow } from "./leases";

const TODAY = "2026-09-08";

const BASE: LeaseCalendarRow = {
  id: "lease-1",
  organizationId: "org-1",
  propertyId: "prop-1",
  label: "Acme Co — Suite 4",
  status: "active",
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

  // BUGFIX-OPS-1: historical one-time milestones are not overdue work.
  const byCategory = (row: LeaseCalendarRow) =>
    Object.fromEntries(projectLeaseMilestones(row, TODAY).map((event) => [event.category, event]));

  it("does not flag a past Lease Start as overdue, but still projects it as Past", () => {
    const events = byCategory({ ...BASE, startDate: "2010-10-19", endDate: "2030-10-18" });
    expect(events.lease_start.overdue).toBe(false);
    expect(events.lease_start.status).toBe("past");
  });

  it("does not flag a past Move-In as overdue", () => {
    const events = byCategory({ ...BASE, startDate: "2015-03-13", moveInDate: "2015-03-13" });
    expect(events.lease_move_in.overdue).toBe(false);
    expect(events.lease_move_in.status).toBe("past");
  });

  it("does not flag past notice, renewal-option or move-out dates as overdue", () => {
    const events = projectLeaseMilestones(
      { ...BASE, noticeDate: "2026-06-01", renewalOptionDate: "2026-07-01", moveOutDate: "2026-08-01" },
      TODAY,
    );
    expect(events.some((event) => event.overdue)).toBe(false);
  });

  it("flags a passed end date on a still-active lease as overdue", () => {
    expect(byCategory({ ...BASE, endDate: "2026-08-31" }).lease_end.overdue).toBe(true);
  });

  it("does not flag an upcoming end date as overdue — it stays an upcoming event", () => {
    const end = byCategory({ ...BASE, endDate: "2026-09-12" }).lease_end;
    expect(end.overdue).toBe(false);
    expect(end.status).toBe("upcoming");
  });

  it("does not flag a terminated lease's passed end date", () => {
    expect(byCategory({ ...BASE, status: "terminated", endDate: "2026-08-31" }).lease_end.overdue).toBe(false);
  });

  it("does not flag a month-to-month lease's stale end date (it has rolled over)", () => {
    expect(byCategory({ ...BASE, status: "month_to_month", endDate: "2026-08-31" }).lease_end.overdue).toBe(false);
  });

  it("does not flag a draft lease's passed end date", () => {
    expect(byCategory({ ...BASE, status: "draft", endDate: "2026-08-31" }).lease_end.overdue).toBe(false);
  });

  it("projects the same set of events as before — the Calendar loses nothing", () => {
    const events = projectLeaseMilestones(
      { ...BASE, startDate: "2010-10-19", endDate: "2026-08-31", moveInDate: "2010-10-19" },
      TODAY,
    );
    expect(events.map((event) => event.category).sort()).toEqual(["lease_end", "lease_move_in", "lease_start"]);
  });
});

describe("isLeaseMilestoneOverdue", () => {
  it("is never true for a non-end milestone, whatever the dates", () => {
    expect(isLeaseMilestoneOverdue({ status: "active", startDate: "2010-01-01", endDate: "2011-01-01" }, "lease_start", TODAY)).toBe(false);
  });

  it("treats an end date of today as not yet overdue", () => {
    expect(isLeaseMilestoneOverdue({ status: "active", startDate: "2026-01-01", endDate: TODAY }, "lease_end", TODAY)).toBe(false);
  });
});
