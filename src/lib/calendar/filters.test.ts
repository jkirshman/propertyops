import { describe, expect, it } from "vitest";

import { applyCalendarFilters, sortCalendarEvents } from "./filters";
import type { CalendarEvent } from "./types";

function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "id-1",
    organizationId: "org-1",
    sourceType: "work_order",
    sourceId: "src-1",
    category: "work_order_scheduled",
    title: "Test event",
    startAt: "2026-09-10T14:00:00.000Z",
    endAt: null,
    allDay: false,
    propertyId: "prop-1",
    vendorId: null,
    assignedUserId: null,
    status: "open",
    statusLabel: "Open",
    overdue: false,
    deepLinkUrl: "/work-orders/src-1",
    metadata: {},
    ...overrides,
  };
}

const CONTEXT = { nowIso: "2026-09-08T00:00:00.000Z", today: "2026-09-08" };

describe("applyCalendarFilters", () => {
  it("filters by property", () => {
    const events = [makeEvent({ propertyId: "prop-1" }), makeEvent({ propertyId: "prop-2" })];
    expect(applyCalendarFilters(events, { propertyId: "prop-1" }, CONTEXT)).toHaveLength(1);
  });

  it("filters by source type", () => {
    const events = [makeEvent({ sourceType: "work_order" }), makeEvent({ sourceType: "lease" })];
    expect(applyCalendarFilters(events, { sourceType: "lease" }, CONTEXT)).toHaveLength(1);
  });

  it("filters by status", () => {
    const events = [makeEvent({ status: "open" }), makeEvent({ status: "closed" })];
    expect(applyCalendarFilters(events, { status: "closed" }, CONTEXT)).toHaveLength(1);
  });

  it("filters by vendor", () => {
    const events = [makeEvent({ vendorId: "vendor-1" }), makeEvent({ vendorId: null })];
    expect(applyCalendarFilters(events, { vendorId: "vendor-1" }, CONTEXT)).toHaveLength(1);
  });

  it("filters by assigned user", () => {
    const events = [makeEvent({ assignedUserId: "user-1" }), makeEvent({ assignedUserId: "user-2" })];
    expect(applyCalendarFilters(events, { assignedUserId: "user-1" }, CONTEXT)).toHaveLength(1);
  });

  it("restricts to a date range by the event's start date", () => {
    const events = [
      makeEvent({ startAt: "2026-08-01T00:00:00.000Z" }),
      makeEvent({ startAt: "2026-09-15T00:00:00.000Z" }),
      makeEvent({ startAt: "2026-10-01T00:00:00.000Z" }),
    ];
    const result = applyCalendarFilters(events, { rangeStart: "2026-09-01", rangeEnd: "2026-09-30" }, CONTEXT);
    expect(result).toHaveLength(1);
    expect(result[0].startAt).toBe("2026-09-15T00:00:00.000Z");
  });

  it("overdueOnly keeps only events flagged overdue", () => {
    const events = [makeEvent({ overdue: true }), makeEvent({ overdue: false })];
    expect(applyCalendarFilters(events, { overdueOnly: true }, CONTEXT)).toHaveLength(1);
  });

  it("upcomingOnly excludes overdue and past events", () => {
    const events = [
      makeEvent({ overdue: true, startAt: "2026-09-01T00:00:00.000Z" }),
      makeEvent({ overdue: false, startAt: "2026-09-20T00:00:00.000Z" }),
      makeEvent({ overdue: false, allDay: true, startAt: "2026-09-01" }),
    ];
    const result = applyCalendarFilters(events, { upcomingOnly: true }, CONTEXT);
    expect(result).toHaveLength(1);
    expect(result[0].startAt).toBe("2026-09-20T00:00:00.000Z");
  });
});

describe("sortCalendarEvents", () => {
  it("sorts chronologically, all-day events before a timed event on the same day", () => {
    const events = [
      makeEvent({ id: "b", startAt: "2026-09-10T08:00:00.000Z" }),
      makeEvent({ id: "a", allDay: true, startAt: "2026-09-10" }),
      makeEvent({ id: "c", startAt: "2026-09-05T00:00:00.000Z" }),
    ];
    expect(sortCalendarEvents(events).map((event) => event.id)).toEqual(["c", "a", "b"]);
  });
});
