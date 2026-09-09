import { describe, expect, it } from "vitest";

import { deriveUnitOccupancy, type UnitOccupancyLease } from "./occupancy";

const TODAY = "2026-09-08";

function lease(overrides: Partial<UnitOccupancyLease> = {}): UnitOccupancyLease {
  return { id: "l-1", tenantId: "t-1", status: "active", startDate: "2026-01-01", endDate: null, ...overrides };
}

describe("deriveUnitOccupancy", () => {
  it("is vacant with no leases", () => {
    expect(deriveUnitOccupancy([], TODAY)).toEqual({ occupied: false, leaseId: null, tenantId: null });
  });

  it("is occupied by an active lease", () => {
    expect(deriveUnitOccupancy([lease()], TODAY)).toEqual({ occupied: true, leaseId: "l-1", tenantId: "t-1" });
  });

  it("is occupied by a month-to-month lease", () => {
    expect(deriveUnitOccupancy([lease({ status: "month_to_month" })], TODAY).occupied).toBe(true);
  });

  it("is vacant when the only lease is a draft", () => {
    expect(deriveUnitOccupancy([lease({ status: "draft" })], TODAY).occupied).toBe(false);
  });

  it("is vacant when the only lease is terminated", () => {
    expect(deriveUnitOccupancy([lease({ status: "terminated" })], TODAY).occupied).toBe(false);
  });

  it("is vacant when the active lease has already ended", () => {
    expect(deriveUnitOccupancy([lease({ endDate: "2026-01-31" })], TODAY).occupied).toBe(false);
  });

  it("is vacant when the active lease hasn't started yet", () => {
    expect(deriveUnitOccupancy([lease({ startDate: "2027-01-01" })], TODAY).occupied).toBe(false);
  });

  it("picks the currently-active lease among several historical ones", () => {
    const leases = [
      lease({ id: "old", status: "terminated" }),
      lease({ id: "current", tenantId: "t-2" }),
    ];
    expect(deriveUnitOccupancy(leases, TODAY)).toEqual({ occupied: true, leaseId: "current", tenantId: "t-2" });
  });
});
