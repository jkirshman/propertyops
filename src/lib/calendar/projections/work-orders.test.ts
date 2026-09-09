import { describe, expect, it } from "vitest";

import { projectWorkOrderEvent, type WorkOrderCalendarRow } from "./work-orders";

const BASE: WorkOrderCalendarRow = {
  id: "wo-1",
  organizationId: "org-1",
  number: "WO-000001",
  subject: "Fix leaking faucet",
  propertyId: "prop-1",
  vendorId: null,
  assignedUserId: "user-1",
  status: "open",
  source: "staff",
  scheduledStartAt: new Date("2026-09-10T14:00:00.000Z"),
  scheduledEndAt: new Date("2026-09-10T15:00:00.000Z"),
};

const NOW = new Date("2026-09-08T00:00:00.000Z");

describe("projectWorkOrderEvent", () => {
  it("returns null when there is no scheduled start", () => {
    expect(projectWorkOrderEvent({ ...BASE, scheduledStartAt: null }, NOW)).toBeNull();
  });

  it("returns null for a preventive-maintenance-sourced work order (represented by the PM projection instead)", () => {
    expect(projectWorkOrderEvent({ ...BASE, source: "preventive_maintenance" }, NOW)).toBeNull();
  });

  it("normalizes a scheduled work order as a timed event", () => {
    const event = projectWorkOrderEvent(BASE, NOW)!;
    expect(event.sourceType).toBe("work_order");
    expect(event.allDay).toBe(false);
    expect(event.startAt).toBe("2026-09-10T14:00:00.000Z");
    expect(event.endAt).toBe("2026-09-10T15:00:00.000Z");
    expect(event.deepLinkUrl).toBe("/work-orders/wo-1");
    expect(event.overdue).toBe(false);
  });

  it("flags a past-scheduled, unresolved work order as overdue", () => {
    const past = new Date("2026-09-15T00:00:00.000Z");
    const event = projectWorkOrderEvent(BASE, past)!;
    expect(event.overdue).toBe(true);
  });

  it("never flags a closed work order as overdue even if its schedule is in the past", () => {
    const past = new Date("2026-09-15T00:00:00.000Z");
    const event = projectWorkOrderEvent({ ...BASE, status: "closed" }, past)!;
    expect(event.overdue).toBe(false);
  });
});
