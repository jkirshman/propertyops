import { describe, expect, it } from "vitest";

import { narrowScopeToPropertyIds, type PropertyScope } from "@/lib/auth/property-access";

import {
  canArchiveProperty,
  countActiveLeases,
  countOpenInspections,
  describeArchiveImpact,
  isPropertyArchived,
  listRequestIncludesArchived,
  planArchiveTransition,
} from "./archive-rules";

const TODAY = "2026-10-02";

describe("planArchiveTransition", () => {
  it("archives an active Property by flipping only isActive, audited as property.archived", () => {
    expect(planArchiveTransition({ isActive: true }, "archive")).toEqual({
      ok: true,
      isActive: false,
      auditAction: "property.archived",
    });
  });

  it("restores an archived Property, audited as property.restored", () => {
    expect(planArchiveTransition({ isActive: false }, "restore")).toEqual({
      ok: true,
      isActive: true,
      auditAction: "property.restored",
    });
  });

  it("refuses to archive twice or restore an active Property", () => {
    expect(planArchiveTransition({ isActive: false }, "archive")).toEqual({ ok: false, error: "already_archived" });
    expect(planArchiveTransition({ isActive: true }, "restore")).toEqual({ ok: false, error: "not_archived" });
  });

  it("treats isActive = false as archived", () => {
    expect(isPropertyArchived({ isActive: false })).toBe(true);
    expect(isPropertyArchived({ isActive: true })).toBe(false);
  });
});

describe("canArchiveProperty", () => {
  it("requires the existing property.edit permission", () => {
    expect(canArchiveProperty(["property.view", "property.edit"])).toBe(true);
  });

  it("denies a user without property.edit (e.g. a User role)", () => {
    expect(canArchiveProperty(["property.view", "work_order.create"])).toBe(false);
    expect(canArchiveProperty([])).toBe(false);
  });
});

describe("archive impact summary", () => {
  it("counts only open (draft / in-progress) Inspections", () => {
    expect(
      countOpenInspections([{ status: "draft" }, { status: "in_progress" }, { status: "completed" }, { status: "cancelled" }]),
    ).toBe(2);
  });

  it("counts current and future Leases, not expired, terminated or draft ones", () => {
    expect(
      countActiveLeases(
        [
          { status: "active", startDate: "2025-01-01", endDate: "2027-01-01" }, // active
          { status: "active", startDate: "2027-01-01", endDate: null }, // upcoming
          { status: "month_to_month", startDate: "2020-01-01", endDate: "2021-01-01" },
          { status: "active", startDate: "2020-01-01", endDate: "2021-01-01" }, // expired
          { status: "terminated", startDate: "2025-01-01", endDate: "2027-01-01" },
          { status: "draft", startDate: "2025-01-01", endDate: null },
        ],
        TODAY,
      ),
    ).toBe(3);
  });

  it("lists only non-zero counts, with correct plurals", () => {
    expect(describeArchiveImpact({ openWorkOrders: 2, activePmPlans: 0, openInspections: 1, activeLeases: 1 })).toEqual([
      "2 open Work Orders",
      "1 open Inspection",
      "1 active Lease",
    ]);
  });

  it("is empty when nothing is still active", () => {
    expect(describeArchiveImpact({ openWorkOrders: 0, activePmPlans: 0, openInspections: 0, activeLeases: 0 })).toEqual([]);
  });
});

describe("listRequestIncludesArchived", () => {
  const params = (query: string) => new URLSearchParams(query);

  it("excludes archived Properties from plain global lists and dashboards", () => {
    expect(listRequestIncludesArchived(params(""))).toBe(false);
    expect(listRequestIncludesArchived(params("status=open&priority=high"))).toBe(false);
  });

  it("keeps them for a vendor / tenant / assignee filter on a global list", () => {
    expect(listRequestIncludesArchived(params("vendorId=v-1"))).toBe(false);
    expect(listRequestIncludesArchived(params("tenantId=t-1"))).toBe(false);
    expect(listRequestIncludesArchived(params("assignedUserId=u-1"))).toBe(false);
  });

  it("includes them for record-history requests so archived detail pages keep their history", () => {
    expect(listRequestIncludesArchived(params("propertyId=p-1"))).toBe(true);
    expect(listRequestIncludesArchived(params("propertyEquipmentId=e-1"))).toBe(true);
    expect(listRequestIncludesArchived(params("propertyComponentId=c-1"))).toBe(true);
    expect(listRequestIncludesArchived(params("assetId=a-1"))).toBe(true);
    expect(listRequestIncludesArchived(params("vendorId=v-1&includeArchived=true"))).toBe(true);
  });

  it("ignores an empty anchor or a non-true flag", () => {
    expect(listRequestIncludesArchived(params("propertyId="))).toBe(false);
    expect(listRequestIncludesArchived(params("includeArchived=1"))).toBe(false);
  });
});

describe("operational scope (Home, Calendar, global lists)", () => {
  const ACTIVE = ["active-1", "active-2"];

  it("turns unrestricted access into whole-property access to active Properties only", () => {
    expect(narrowScopeToPropertyIds({ kind: "all" }, ACTIVE)).toEqual({
      kind: "scoped",
      access: [
        { propertyId: "active-1", propertyUnitId: null },
        { propertyId: "active-2", propertyUnitId: null },
      ],
    });
  });

  it("drops a scoped user's archived Property but keeps Unit restrictions on the rest", () => {
    const scope: PropertyScope = {
      kind: "scoped",
      access: [
        { propertyId: "archived-1", propertyUnitId: null },
        { propertyId: "active-1", propertyUnitId: "unit-3" },
      ],
    };
    expect(narrowScopeToPropertyIds(scope, ACTIVE)).toEqual({
      kind: "scoped",
      access: [{ propertyId: "active-1", propertyUnitId: "unit-3" }],
    });
  });

  it("does not mutate the user's own access rows (they survive for a restore)", () => {
    const access = [{ propertyId: "archived-1", propertyUnitId: null }];
    narrowScopeToPropertyIds({ kind: "scoped", access }, ACTIVE);
    expect(access).toEqual([{ propertyId: "archived-1", propertyUnitId: null }]);
  });

  it("fails closed for a User whose only Property is archived", () => {
    expect(
      narrowScopeToPropertyIds({ kind: "scoped", access: [{ propertyId: "archived-1", propertyUnitId: null }] }, ACTIVE),
    ).toEqual({ kind: "scoped", access: [] });
  });
});
