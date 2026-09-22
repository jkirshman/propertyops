import { describe, expect, it } from "vitest";

import type { PropertyScope } from "@/lib/auth/property-access";
import { projectInspectionEvent, type InspectionCalendarRow } from "@/lib/calendar/projections/inspections";
import { selectDueInspections, type AppBriefInspectionItem } from "@/lib/home/app-brief";

import { canAccessInspection, filterAccessibleInspections } from "./inspection-access";

const ST_JOE = "st-joe";
const OTHER_PROPERTY = "other-property";
const FITNESS = "unit-fitness";
const RESTAURANT = "unit-restaurant";

// One reusable template ("General Facility Inspection") run three times —
// Unit ownership is on each Inspection instance, not the template.
const TEMPLATE = "General Facility Inspection";
const inspections = {
  exterior: { id: "insp-exterior", templateName: TEMPLATE, propertyId: ST_JOE, propertyUnitId: null },
  fitness: { id: "insp-fitness", templateName: TEMPLATE, propertyId: ST_JOE, propertyUnitId: FITNESS },
  restaurant: { id: "insp-restaurant", templateName: TEMPLATE, propertyId: ST_JOE, propertyUnitId: RESTAURANT },
  elsewhere: { id: "insp-elsewhere", templateName: TEMPLATE, propertyId: OTHER_PROPERTY, propertyUnitId: null },
};
const ALL = Object.values(inspections);

const ADMIN: PropertyScope = { kind: "all" };
const WHOLE_ST_JOE: PropertyScope = { kind: "scoped", access: [{ propertyId: ST_JOE, propertyUnitId: null }] };
const FITNESS_USER: PropertyScope = { kind: "scoped", access: [{ propertyId: ST_JOE, propertyUnitId: FITNESS }] };
const BOTH_UNITS_USER: PropertyScope = {
  kind: "scoped",
  access: [
    { propertyId: ST_JOE, propertyUnitId: FITNESS },
    { propertyId: ST_JOE, propertyUnitId: RESTAURANT },
  ],
};
const NO_ACCESS: PropertyScope = { kind: "scoped", access: [] };

const visibleIds = (scope: PropertyScope) => filterAccessibleInspections(scope, ALL).map((row) => row.id);

describe("Inspection visibility (canAccessInspection / filterAccessibleInspections)", () => {
  it("Admin sees every Inspection", () => {
    expect(visibleIds(ADMIN)).toEqual(ALL.map((row) => row.id));
  });

  it("a whole-Property Manager or User sees Shared + both businesses", () => {
    expect(visibleIds(WHOLE_ST_JOE)).toEqual(["insp-exterior", "insp-fitness", "insp-restaurant"]);
  });

  it("a Fitness Center User sees the Shared exterior + Fitness Center Inspections only", () => {
    expect(visibleIds(FITNESS_USER)).toEqual(["insp-exterior", "insp-fitness"]);
  });

  it("a User on both Units sees Shared + both", () => {
    expect(visibleIds(BOTH_UNITS_USER)).toEqual(["insp-exterior", "insp-fitness", "insp-restaurant"]);
  });

  it("no Property access sees nothing", () => {
    expect(visibleIds(NO_ACCESS)).toEqual([]);
  });

  it("direct URL/API to the Restaurant Inspection is denied (detail, responses, completion, conversion all 404 on false)", () => {
    expect(canAccessInspection(FITNESS_USER, inspections.restaurant)).toBe(false);
  });

  it("the same template is visible or hidden per run, never per template", () => {
    expect(canAccessInspection(FITNESS_USER, inspections.fitness)).toBe(true);
    expect(canAccessInspection(FITNESS_USER, inspections.restaurant)).toBe(false);
  });
});

describe("Home App Brief: due Inspections are Unit-scoped", () => {
  const briefRow = (id: string, propertyUnitId: string | null): AppBriefInspectionItem & { propertyUnitId: string | null } => ({
    id,
    templateName: TEMPLATE,
    scheduledDate: "2026-09-20",
    status: "draft",
    propertyId: ST_JOE,
    propertyName: "St. Joe",
    propertyUnitId,
  });
  const rows = [briefRow("shared", null), briefRow("fitness", FITNESS), briefRow("restaurant", RESTAURANT)];

  it("counts only Shared + Fitness Center for a Fitness Center User", () => {
    const section = selectDueInspections(filterAccessibleInspections(FITNESS_USER, rows), "2026-09-22");
    expect(section.totalCount).toBe(2);
    expect(section.items.map((item) => item.id)).toEqual(["shared", "fitness"]);
  });
});

describe("Calendar: Inspection events are Unit-scoped", () => {
  const calendarRow = (id: string, propertyUnitId: string | null): InspectionCalendarRow => ({
    id,
    organizationId: "org-1",
    propertyId: ST_JOE,
    propertyUnitId,
    templateName: `${TEMPLATE} ${id}`,
    status: "draft",
    inspectorUserId: null,
    scheduledDate: "2026-09-25",
    scheduledStartAt: null,
    scheduledEndAt: null,
  });

  it("drops Restaurant events for a Fitness Center User", () => {
    const rows = [calendarRow("shared", null), calendarRow("fitness", FITNESS), calendarRow("restaurant", RESTAURANT)];
    const events = filterAccessibleInspections(FITNESS_USER, rows).map((row) =>
      projectInspectionEvent(row, new Date("2026-09-22T00:00:00.000Z"), "2026-09-22"),
    );
    expect(events.map((event) => event?.sourceId)).toEqual(["shared", "fitness"]);
  });
});
