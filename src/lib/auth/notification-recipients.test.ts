import { describe, expect, it } from "vitest";

import { selectRecipientsWithPropertyUnitAccess, type RecipientAccessRow } from "./property-access";

// UNIT-OPS-1: Work Order / Inspection notifications only reach people who
// could open the record — the same canAccessPropertyUnit rule as the pages.
const ST_JOE = "st-joe";
const FITNESS = "unit-fitness";
const RESTAURANT = "unit-restaurant";

const candidates = [
  { id: "admin", unrestricted: true },
  { id: "manager", unrestricted: false },
  { id: "fitness-user", unrestricted: false },
  { id: "restaurant-user", unrestricted: false },
  { id: "no-access-user", unrestricted: false },
];
const accessRows: RecipientAccessRow[] = [
  { userId: "manager", propertyId: ST_JOE, propertyUnitId: null },
  { userId: "fitness-user", propertyId: ST_JOE, propertyUnitId: FITNESS },
  { userId: "restaurant-user", propertyId: ST_JOE, propertyUnitId: RESTAURANT },
];

const recipients = (propertyUnitId: string | null) =>
  selectRecipientsWithPropertyUnitAccess(candidates, accessRows, ST_JOE, propertyUnitId);

describe("selectRecipientsWithPropertyUnitAccess", () => {
  it("a Restaurant Work Order never notifies the Fitness Center User", () => {
    expect(recipients(RESTAURANT)).toEqual(["admin", "manager", "restaurant-user"]);
  });

  it("a Fitness Center Inspection never notifies the Restaurant User", () => {
    expect(recipients(FITNESS)).toEqual(["admin", "manager", "fitness-user"]);
  });

  it("a Shared record notifies everyone with access to the Property", () => {
    expect(recipients(null)).toEqual(["admin", "manager", "fitness-user", "restaurant-user"]);
  });

  it("never notifies a user without access to the Property", () => {
    expect(recipients(null)).not.toContain("no-access-user");
  });
});
