import { describe, expect, it } from "vitest";

import { projectOperationalEvent, type OperationalEventRow } from "./operational-events";

const NOW = new Date("2026-09-08T12:00:00.000Z");

const BASE: OperationalEventRow = {
  id: "evt-1",
  organizationId: "org-1",
  propertyId: "prop-1",
  title: "Property walkthrough",
  description: null,
  startAt: new Date("2026-09-10T14:00:00.000Z"),
  endAt: new Date("2026-09-10T15:00:00.000Z"),
  allDay: false,
  status: "active",
  createdByUserId: "user-1",
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};

describe("projectOperationalEvent", () => {
  it("projects a timed manual event", () => {
    const event = projectOperationalEvent(BASE, NOW);
    expect(event.sourceType).toBe("manual");
    expect(event.allDay).toBe(false);
    expect(event.startAt).toBe("2026-09-10T14:00:00.000Z");
    expect(event.overdue).toBe(false);
  });

  it("reads the all-day date directly off the stored UTC midnight, without re-converting through a timezone", () => {
    const event = projectOperationalEvent(
      { ...BASE, allDay: true, startAt: new Date("2026-09-10T00:00:00.000Z"), endAt: null },
      NOW,
    );
    expect(event.startAt).toBe("2026-09-10");
  });

  it("flags a past active event as overdue", () => {
    const past = new Date("2026-09-15T00:00:00.000Z");
    expect(projectOperationalEvent(BASE, past).overdue).toBe(true);
  });

  it("never flags a cancelled event as overdue", () => {
    const past = new Date("2026-09-15T00:00:00.000Z");
    expect(projectOperationalEvent({ ...BASE, status: "cancelled" }, past).overdue).toBe(false);
  });
});
