import { describe, expect, it } from "vitest";

import type { PropertyScope } from "@/lib/auth/property-access";
import { projectWorkOrderEvent, type WorkOrderCalendarRow } from "@/lib/calendar/projections/work-orders";
import { selectOverdueWorkOrders, type AppBriefWorkOrderItem } from "@/lib/home/app-brief";
import { canAccessRelatedEntityPropertyContext } from "@/lib/files/related-entity-rules";

import { canAccessWorkOrder, filterAccessibleWorkOrders, redactHiddenOccurrenceWorkOrder } from "./work-order-access";

// St. Joe: Fitness Center and Restaurant are separate businesses in one Property.
const ST_JOE = "st-joe";
const OTHER_PROPERTY = "other-property";
const FITNESS = "unit-fitness";
const RESTAURANT = "unit-restaurant";

const workOrders = {
  parkingLot: { id: "wo-parking", propertyId: ST_JOE, propertyUnitId: null },
  treadmill: { id: "wo-treadmill", propertyId: ST_JOE, propertyUnitId: FITNESS },
  kitchenDrain: { id: "wo-drain", propertyId: ST_JOE, propertyUnitId: RESTAURANT },
  elsewhere: { id: "wo-elsewhere", propertyId: OTHER_PROPERTY, propertyUnitId: null },
};
const ALL = Object.values(workOrders);
const ST_JOE_IDS = ["wo-parking", "wo-treadmill", "wo-drain"];

const ADMIN: PropertyScope = { kind: "all" };
// Manager and whole-Property User look identical to the rule: one whole-Property row.
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

const visibleIds = (scope: PropertyScope) => filterAccessibleWorkOrders(scope, ALL).map((row) => row.id);

describe("Work Order visibility (canAccessWorkOrder / filterAccessibleWorkOrders)", () => {
  it("Admin sees every Work Order in the organization", () => {
    expect(visibleIds(ADMIN)).toEqual(ALL.map((row) => row.id));
  });

  it("a whole-Property Manager or User sees Shared + every Unit at that Property only", () => {
    expect(visibleIds(WHOLE_ST_JOE)).toEqual(ST_JOE_IDS);
  });

  it("a Fitness Center User sees Shared + Fitness Center, not Restaurant", () => {
    expect(visibleIds(FITNESS_USER)).toEqual(["wo-parking", "wo-treadmill"]);
    expect(canAccessWorkOrder(FITNESS_USER, workOrders.kitchenDrain)).toBe(false);
  });

  it("a User on both Units sees Shared + both", () => {
    expect(visibleIds(BOTH_UNITS_USER)).toEqual(ST_JOE_IDS);
  });

  it("a User with no Property access sees nothing (fail closed)", () => {
    expect(visibleIds(NO_ACCESS)).toEqual([]);
  });

  it("follows access rows, not role names: a Manager with only a Unit row is Unit-restricted", () => {
    const unitOnlyManager: PropertyScope = FITNESS_USER;
    expect(canAccessWorkOrder(unitOnlyManager, workOrders.kitchenDrain)).toBe(false);
  });

  it("direct URL to another Unit's Work Order resolves as not-found (the detail/notes/activity routes 404 on false)", () => {
    expect(canAccessWorkOrder(FITNESS_USER, workOrders.kitchenDrain)).toBe(false);
    expect(canAccessWorkOrder(FITNESS_USER, workOrders.elsewhere)).toBe(false);
  });

  it("existing Work Orders (migrated as NULL) stay visible to Unit-restricted Users as Shared", () => {
    expect(canAccessWorkOrder(FITNESS_USER, workOrders.parkingLot)).toBe(true);
  });
});

describe("Home App Brief counts exclude other Units' Work Orders", () => {
  const LONG_AGO = new Date("2026-01-01T00:00:00.000Z");
  const briefRow = (id: string, propertyUnitId: string | null): AppBriefWorkOrderItem & { propertyUnitId: string | null } => ({
    id,
    number: id,
    subject: id,
    priority: "normal",
    status: "open",
    openedAt: LONG_AGO,
    propertyId: ST_JOE,
    propertyName: "St. Joe",
    propertyUnitId,
  });
  // Restaurant has 4 overdue Work Orders; Fitness Center has 1.
  const rows = [
    briefRow("r1", RESTAURANT),
    briefRow("r2", RESTAURANT),
    briefRow("r3", RESTAURANT),
    briefRow("r4", RESTAURANT),
    briefRow("f1", FITNESS),
  ];

  it("a Fitness Center-only User's overdue total is 1, not 5", () => {
    const section = selectOverdueWorkOrders(filterAccessibleWorkOrders(FITNESS_USER, rows), "2026-09-22");
    expect(section.totalCount).toBe(1);
    expect(section.items.map((item) => item.id)).toEqual(["f1"]);
  });

  it("a whole-Property Manager's total is 5", () => {
    expect(selectOverdueWorkOrders(filterAccessibleWorkOrders(WHOLE_ST_JOE, rows), "2026-09-22").totalCount).toBe(5);
  });
});

describe("Calendar never projects another Unit's Work Orders", () => {
  const calendarRow = (id: string, propertyUnitId: string | null): WorkOrderCalendarRow => ({
    id,
    organizationId: "org-1",
    number: id,
    subject: `Subject ${id}`,
    propertyId: ST_JOE,
    propertyUnitId,
    vendorId: null,
    assignedUserId: null,
    status: "open",
    source: "staff",
    scheduledStartAt: new Date("2026-09-25T14:00:00.000Z"),
    scheduledEndAt: null,
  });

  it("Fitness Center User: only Shared + Fitness Center events — no Restaurant titles", () => {
    const rows = [calendarRow("shared", null), calendarRow("fitness", FITNESS), calendarRow("restaurant", RESTAURANT)];
    const events = filterAccessibleWorkOrders(FITNESS_USER, rows).map((row) =>
      projectWorkOrderEvent(row, new Date("2026-09-22T00:00:00.000Z")),
    );
    expect(events.map((event) => event?.sourceId)).toEqual(["shared", "fitness"]);
    expect(events.map((event) => event?.title).join(" ")).not.toContain("restaurant");
  });
});

describe("Work Order attachments inherit the Work Order's access", () => {
  it("hides a Restaurant Work Order's files (and filenames) from a Fitness Center User", () => {
    expect(canAccessRelatedEntityPropertyContext(FITNESS_USER, { propertyId: ST_JOE, propertyUnitId: RESTAURANT })).toBe(
      false,
    );
  });

  it("shows Shared and own-Unit Work Order files", () => {
    expect(canAccessRelatedEntityPropertyContext(FITNESS_USER, { propertyId: ST_JOE, propertyUnitId: null })).toBe(true);
    expect(canAccessRelatedEntityPropertyContext(FITNESS_USER, { propertyId: ST_JOE, propertyUnitId: FITNESS })).toBe(
      true,
    );
  });
});

describe("redactHiddenOccurrenceWorkOrder", () => {
  const occurrence = (propertyUnitId: string | null) => ({
    id: "occ-1",
    workOrderId: "wo-1",
    workOrderNumber: "WO-000001",
    workOrderStatus: "open",
    workOrderPropertyId: ST_JOE,
    workOrderPropertyUnitId: propertyUnitId,
  });

  it("drops another Unit's Work Order link/number/status from a visible PM occurrence", () => {
    expect(redactHiddenOccurrenceWorkOrder(FITNESS_USER, occurrence(RESTAURANT))).toEqual({
      id: "occ-1",
      workOrderId: null,
      workOrderNumber: null,
      workOrderStatus: null,
    });
  });

  it("keeps an accessible Work Order link", () => {
    expect(redactHiddenOccurrenceWorkOrder(FITNESS_USER, occurrence(null)).workOrderNumber).toBe("WO-000001");
  });
});
