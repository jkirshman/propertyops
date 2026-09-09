import { describe, expect, it } from "vitest";

import { projectInspectionEvent, type InspectionCalendarRow } from "./inspections";

const TODAY = "2026-09-08";
const NOW = new Date("2026-09-08T12:00:00.000Z");

const BASE: InspectionCalendarRow = {
  id: "insp-1",
  organizationId: "org-1",
  propertyId: "prop-1",
  templateName: "Fire / Life Safety",
  status: "draft",
  inspectorUserId: "user-1",
  scheduledDate: null,
  scheduledStartAt: null,
  scheduledEndAt: null,
};

describe("projectInspectionEvent", () => {
  it("returns null when there is no date to plot", () => {
    expect(projectInspectionEvent(BASE, NOW, TODAY)).toBeNull();
  });

  it("projects a date-only due event from scheduledDate", () => {
    const event = projectInspectionEvent({ ...BASE, scheduledDate: "2026-09-20" }, NOW, TODAY)!;
    expect(event.category).toBe("inspection_due");
    expect(event.allDay).toBe(true);
    expect(event.startAt).toBe("2026-09-20");
  });

  it("projects a timed event once scheduledStartAt is set, even alongside scheduledDate", () => {
    const event = projectInspectionEvent(
      {
        ...BASE,
        scheduledDate: "2026-09-20",
        scheduledStartAt: new Date("2026-09-20T14:00:00.000Z"),
      },
      NOW,
      TODAY,
    )!;
    expect(event.category).toBe("inspection_scheduled");
    expect(event.allDay).toBe(false);
    expect(event.startAt).toBe("2026-09-20T14:00:00.000Z");
  });

  it("flags a past-due draft inspection as overdue", () => {
    const event = projectInspectionEvent({ ...BASE, scheduledDate: "2026-09-01" }, NOW, TODAY)!;
    expect(event.overdue).toBe(true);
  });

  it("never flags a completed inspection as overdue", () => {
    const event = projectInspectionEvent(
      { ...BASE, status: "completed", scheduledDate: "2026-09-01" },
      NOW,
      TODAY,
    )!;
    expect(event.overdue).toBe(false);
  });
});
