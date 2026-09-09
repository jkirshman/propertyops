import { describe, expect, it } from "vitest";

import { isNotificationCategory } from "@/lib/notifications/categories";

import {
  APP_BRIEF_SECTION_CATEGORY,
  isAppBriefSectionVisible,
  selectDueInspections,
  selectDuePmPlans,
  selectExpiringCompliance,
  selectLeaseMilestones,
  selectOverdueWorkOrders,
  selectUrgentWorkOrders,
  type AppBriefComplianceItem,
  type AppBriefInspectionItem,
  type AppBriefLeaseItem,
  type AppBriefPmPlanItem,
  type AppBriefWorkOrderItem,
} from "./app-brief";

const TODAY = "2026-09-08";

function workOrder(overrides: Partial<AppBriefWorkOrderItem> = {}): AppBriefWorkOrderItem {
  return {
    id: "wo-1",
    number: "WO-000001",
    subject: "Test",
    priority: "normal",
    status: "open",
    openedAt: new Date(`${TODAY}T00:00:00Z`),
    propertyId: "prop-1",
    propertyName: "Test Property",
    ...overrides,
  };
}

describe("selectOverdueWorkOrders", () => {
  it("excludes a work order opened today", () => {
    expect(selectOverdueWorkOrders([workOrder()], TODAY).items).toHaveLength(0);
  });

  it("includes a work order opened past the stale threshold", () => {
    const stale = workOrder({ id: "wo-stale", openedAt: new Date("2026-08-01T00:00:00Z") });
    expect(selectOverdueWorkOrders([stale], TODAY).items.map((i) => i.id)).toEqual(["wo-stale"]);
  });

  it("sorts oldest first and reports totalCount beyond the cap", () => {
    const rows = Array.from({ length: 7 }, (_, i) =>
      workOrder({ id: `wo-${i}`, openedAt: new Date(`2026-0${i === 9 ? 9 : 1}-0${i + 1}T00:00:00Z`) }),
    );
    const result = selectOverdueWorkOrders(rows, TODAY, 5);
    expect(result.totalCount).toBe(7);
    expect(result.items).toHaveLength(5);
    expect(result.items[0].id).toBe("wo-0");
  });
});

describe("selectUrgentWorkOrders", () => {
  it("includes high and urgent, excludes normal/low", () => {
    const rows = [
      workOrder({ id: "normal", priority: "normal" }),
      workOrder({ id: "low", priority: "low" }),
      workOrder({ id: "high", priority: "high" }),
      workOrder({ id: "urgent", priority: "urgent" }),
    ];
    const result = selectUrgentWorkOrders(rows);
    expect(result.items.map((i) => i.id).sort()).toEqual(["high", "urgent"]);
  });

  it("ranks urgent before high", () => {
    const rows = [workOrder({ id: "high", priority: "high" }), workOrder({ id: "urgent", priority: "urgent" })];
    expect(selectUrgentWorkOrders(rows).items.map((i) => i.id)).toEqual(["urgent", "high"]);
  });
});

function pmPlan(overrides: Partial<AppBriefPmPlanItem> = {}): AppBriefPmPlanItem {
  return { id: "pm-1", name: "Test Plan", nextDueAt: TODAY, propertyId: "prop-1", propertyName: "Test Property", ...overrides };
}

describe("selectDuePmPlans", () => {
  it("includes a plan due exactly today", () => {
    expect(selectDuePmPlans([pmPlan({ nextDueAt: TODAY })], TODAY).items).toHaveLength(1);
  });

  it("includes an overdue plan", () => {
    expect(selectDuePmPlans([pmPlan({ nextDueAt: "2026-09-01" })], TODAY).items).toHaveLength(1);
  });

  it("excludes a plan due in the future", () => {
    expect(selectDuePmPlans([pmPlan({ nextDueAt: "2026-09-09" })], TODAY).items).toHaveLength(0);
  });
});

function complianceRecord(overrides: Partial<AppBriefComplianceItem> = {}): AppBriefComplianceItem {
  return { id: "c-1", name: "Fire Inspection", expirationDate: null, propertyId: "prop-1", propertyName: "Test Property", ...overrides };
}

describe("selectExpiringCompliance", () => {
  it("excludes a record with no expiration date", () => {
    expect(selectExpiringCompliance([complianceRecord()], TODAY).items).toHaveLength(0);
  });

  it("excludes a current (not-yet-expiring) record", () => {
    expect(selectExpiringCompliance([complianceRecord({ expirationDate: "2027-01-01" })], TODAY).items).toHaveLength(0);
  });

  it("includes an expired record and an expiring-soon record, expired first", () => {
    const rows = [
      complianceRecord({ id: "soon", expirationDate: "2026-09-20" }),
      complianceRecord({ id: "expired", expirationDate: "2026-09-01" }),
    ];
    const result = selectExpiringCompliance(rows, TODAY);
    expect(result.items.map((i) => i.id)).toEqual(["expired", "soon"]);
    expect(result.items[0].status).toBe("expired");
  });
});

function inspection(overrides: Partial<AppBriefInspectionItem> = {}): AppBriefInspectionItem {
  return { id: "i-1", templateName: "Fire Safety", scheduledDate: TODAY, status: "draft", propertyId: "prop-1", propertyName: "Test Property", ...overrides };
}

describe("selectDueInspections", () => {
  it("excludes a completed inspection even if scheduled date is overdue", () => {
    expect(selectDueInspections([inspection({ status: "completed", scheduledDate: "2026-08-01" })], TODAY).items).toHaveLength(0);
  });

  it("includes an overdue, not-yet-completed inspection", () => {
    expect(selectDueInspections([inspection({ scheduledDate: "2026-08-01" })], TODAY).items).toHaveLength(1);
  });

  it("includes an inspection due within the threshold window", () => {
    expect(selectDueInspections([inspection({ scheduledDate: "2026-09-12" })], TODAY, 7).items).toHaveLength(1);
  });

  it("excludes an inspection scheduled well beyond the window", () => {
    expect(selectDueInspections([inspection({ scheduledDate: "2026-12-01" })], TODAY, 7).items).toHaveLength(0);
  });

  it("excludes an inspection with no scheduled date", () => {
    expect(selectDueInspections([inspection({ scheduledDate: null })], TODAY).items).toHaveLength(0);
  });
});

function lease(overrides: Partial<AppBriefLeaseItem> = {}): AppBriefLeaseItem {
  return {
    id: "l-1",
    label: "Suite 100",
    status: "active",
    startDate: "2026-01-01",
    endDate: null,
    noticeDate: null,
    renewalOptionDate: null,
    propertyId: "prop-1",
    propertyName: "Test Property",
    ...overrides,
  };
}

describe("selectLeaseMilestones", () => {
  it("excludes a terminated lease even with an approaching end date", () => {
    expect(
      selectLeaseMilestones([lease({ status: "terminated", endDate: "2026-09-15" })], TODAY).items,
    ).toHaveLength(0);
  });

  it("excludes a draft lease", () => {
    expect(selectLeaseMilestones([lease({ status: "draft", endDate: "2026-09-15" })], TODAY).items).toHaveLength(0);
  });

  it("includes an active lease with an end date inside the widest expiring threshold", () => {
    expect(selectLeaseMilestones([lease({ endDate: "2026-10-01" })], TODAY).items).toHaveLength(1);
  });

  it("excludes an active lease with an end date far in the future", () => {
    expect(selectLeaseMilestones([lease({ endDate: "2028-01-01" })], TODAY).items).toHaveLength(0);
  });

  it("includes a lease with an approaching notice date", () => {
    expect(selectLeaseMilestones([lease({ noticeDate: "2026-09-20" })], TODAY).items).toHaveLength(1);
  });

  it("includes a lease with an approaching renewal option date", () => {
    expect(selectLeaseMilestones([lease({ renewalOptionDate: "2026-09-25" })], TODAY).items).toHaveLength(1);
  });
});

describe("isAppBriefSectionVisible", () => {
  it("shows the section when authorized and the App Brief preference is on", () => {
    expect(isAppBriefSectionVisible(true, true)).toBe(true);
  });

  it("hides the section when authorized but the App Brief preference is off", () => {
    expect(isAppBriefSectionVisible(true, false)).toBe(false);
  });

  it("hides the section when unauthorized even if the App Brief preference is on — preferences cannot expand access", () => {
    expect(isAppBriefSectionVisible(false, true)).toBe(false);
  });

  it("hides the section when both unauthorized and the preference is off", () => {
    expect(isAppBriefSectionVisible(false, false)).toBe(false);
  });
});

describe("APP_BRIEF_SECTION_CATEGORY", () => {
  it("maps every section to a real notification category", () => {
    for (const category of Object.values(APP_BRIEF_SECTION_CATEGORY)) {
      expect(isNotificationCategory(category)).toBe(true);
    }
  });

  it("maps both work order sections to work_orders", () => {
    expect(APP_BRIEF_SECTION_CATEGORY.overdueWorkOrders).toBe("work_orders");
    expect(APP_BRIEF_SECTION_CATEGORY.urgentWorkOrders).toBe("work_orders");
  });

  it("maps the PM section to preventive_maintenance", () => {
    expect(APP_BRIEF_SECTION_CATEGORY.duePmPlans).toBe("preventive_maintenance");
  });

  it("maps the inspections section to inspections", () => {
    expect(APP_BRIEF_SECTION_CATEGORY.dueInspections).toBe("inspections");
  });

  it("maps the compliance section to compliance", () => {
    expect(APP_BRIEF_SECTION_CATEGORY.expiringCompliance).toBe("compliance");
  });

  it("maps the lease section to leases", () => {
    expect(APP_BRIEF_SECTION_CATEGORY.leaseMilestones).toBe("leases");
  });

  it("maps the equipment section to equipment_assets", () => {
    expect(APP_BRIEF_SECTION_CATEGORY.attentionEquipment).toBe("equipment_assets");
  });
});
