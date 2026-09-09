import { describe, expect, it } from "vitest";

import {
  projectPmPlanDue,
  projectPmWorkOrderEvent,
  type PmOccurrenceRow,
  type PmPlanDueRow,
} from "./preventive-maintenance";

const TODAY = "2026-09-08";
const NOW = new Date("2026-09-08T12:00:00.000Z");

describe("projectPmPlanDue", () => {
  const plan: PmPlanDueRow = {
    id: "plan-1",
    organizationId: "org-1",
    propertyId: "prop-1",
    name: "Quarterly HVAC Service",
    nextDueAt: "2026-09-20",
  };

  it("projects an all-day due event", () => {
    const event = projectPmPlanDue(plan, TODAY);
    expect(event.category).toBe("pm_due");
    expect(event.allDay).toBe(true);
    expect(event.startAt).toBe("2026-09-20");
    expect(event.deepLinkUrl).toBe("/preventive-maintenance/plan-1");
  });

  it("flags a past-due plan as overdue", () => {
    const event = projectPmPlanDue({ ...plan, nextDueAt: "2026-09-01" }, TODAY);
    expect(event.overdue).toBe(true);
  });

  it("does not flag a future due date as overdue", () => {
    const event = projectPmPlanDue(plan, TODAY);
    expect(event.overdue).toBe(false);
  });
});

describe("projectPmWorkOrderEvent", () => {
  const occurrence: PmOccurrenceRow = {
    occurrenceId: "occ-1",
    organizationId: "org-1",
    propertyId: "prop-1",
    dueDate: "2026-09-01",
    planId: "plan-1",
    planName: "Quarterly HVAC Service",
    workOrderId: "wo-1",
    workOrderNumber: "WO-000002",
    workOrderSubject: "Quarterly HVAC Service",
    workOrderStatus: "open",
    workOrderAssignedUserId: "user-1",
    workOrderVendorId: null,
    workOrderScheduledStartAt: null,
    workOrderScheduledEndAt: null,
  };

  it("falls back to an all-day event on the occurrence due date when the work order has no schedule", () => {
    const event = projectPmWorkOrderEvent(occurrence, NOW, TODAY);
    expect(event.allDay).toBe(true);
    expect(event.startAt).toBe("2026-09-01");
    expect(event.deepLinkUrl).toBe("/work-orders/wo-1");
    expect(event.overdue).toBe(true);
  });

  it("uses the work order's own schedule as a timed event once one is set", () => {
    const scheduled: PmOccurrenceRow = {
      ...occurrence,
      dueDate: "2026-09-01",
      workOrderScheduledStartAt: new Date("2026-09-20T14:00:00.000Z"),
      workOrderScheduledEndAt: new Date("2026-09-20T15:00:00.000Z"),
    };
    const event = projectPmWorkOrderEvent(scheduled, NOW, TODAY);
    expect(event.allDay).toBe(false);
    expect(event.startAt).toBe("2026-09-20T14:00:00.000Z");
    // Not overdue: the scheduled visit is in the future, even though the
    // occurrence's raw due date has already passed.
    expect(event.overdue).toBe(false);
  });

  it("never flags a completed work order's occurrence as overdue", () => {
    const event = projectPmWorkOrderEvent({ ...occurrence, workOrderStatus: "closed" }, NOW, TODAY);
    expect(event.overdue).toBe(false);
  });
});
