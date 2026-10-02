import { describe, expect, it } from "vitest";

import {
  GLOBAL_BACK_TARGETS,
  editPageBackTarget,
  parseFromProperty,
  propertyOwnedBackTarget,
  propertyRecordBackTarget,
  propertyTabHref,
  tenantBackTarget,
  withFromProperty,
} from "./back-links";

const PROPERTY_A = "11111111-1111-4111-8111-111111111111";
const PROPERTY_B = "22222222-2222-4222-8222-222222222222";

describe("parseFromProperty", () => {
  it("accepts a single well-formed id", () => {
    expect(parseFromProperty(PROPERTY_A)).toBe(PROPERTY_A);
  });

  it("rejects external URLs, paths and other non-id values", () => {
    for (const value of [
      "https://evil.example.com",
      "//evil.example.com",
      "/admin/users",
      "javascript:alert(1)",
      `${PROPERTY_A}/../../admin`,
      ` ${PROPERTY_A}`,
      "",
      "not-an-id",
    ]) {
      expect(parseFromProperty(value)).toBeUndefined();
    }
  });

  it("rejects missing and repeated params", () => {
    expect(parseFromProperty(undefined)).toBeUndefined();
    expect(parseFromProperty([PROPERTY_A, PROPERTY_B])).toBeUndefined();
  });
});

describe("withFromProperty", () => {
  it("appends the origin to a plain or query-bearing href", () => {
    expect(withFromProperty("/work-orders/wo-1", PROPERTY_A)).toBe(`/work-orders/wo-1?fromProperty=${PROPERTY_A}`);
    expect(withFromProperty("/x?a=1", PROPERTY_A)).toBe(`/x?a=1&fromProperty=${PROPERTY_A}`);
  });
});

describe("Property-owned records", () => {
  it("uses the existing ?tab= deep-link convention", () => {
    expect(propertyTabHref(PROPERTY_A, "units")).toBe(`/properties/${PROPERTY_A}?tab=units`);
  });

  it("returns Equipment to the owning Property's Equipment tab", () => {
    expect(propertyOwnedBackTarget({ propertyId: PROPERTY_A }, "equipment")).toEqual({
      href: `/properties/${PROPERTY_A}?tab=equipment`,
      label: "Back to Property Equipment",
    });
  });

  it("returns a Component to the owning Property's Components tab", () => {
    expect(propertyOwnedBackTarget({ propertyId: PROPERTY_A }, "components").href).toBe(
      `/properties/${PROPERTY_A}?tab=components`,
    );
  });

  it("returns a Lease to the owning Property's Tenants / Leases tab", () => {
    expect(propertyOwnedBackTarget({ propertyId: PROPERTY_A }, "leases").href).toBe(
      `/properties/${PROPERTY_A}?tab=leases`,
    );
  });
});

describe("propertyRecordBackTarget", () => {
  const record = { propertyId: PROPERTY_A };

  it("returns to the Property tab when opened from that Property", () => {
    expect(propertyRecordBackTarget("workOrder", record, PROPERTY_A).href).toBe(
      `/properties/${PROPERTY_A}?tab=workorders`,
    );
    expect(propertyRecordBackTarget("inspection", record, PROPERTY_A).href).toBe(
      `/properties/${PROPERTY_A}?tab=inspections`,
    );
    expect(propertyRecordBackTarget("preventiveMaintenance", record, PROPERTY_A).href).toBe(
      `/properties/${PROPERTY_A}?tab=maintenance`,
    );
  });

  it("falls back to the global list without origin context (deep link, notification)", () => {
    expect(propertyRecordBackTarget("workOrder", record, undefined).href).toBe("/work-orders");
    expect(propertyRecordBackTarget("inspection", record, undefined).href).toBe("/inspections");
    expect(propertyRecordBackTarget("preventiveMaintenance", record, undefined).href).toBe("/preventive-maintenance");
  });

  it("ignores an origin that is not the record's own Property", () => {
    expect(propertyRecordBackTarget("workOrder", record, PROPERTY_B).href).toBe("/work-orders");
  });
});

describe("tenantBackTarget", () => {
  it("returns to the Tenants / Leases tab of the Property the user came from", () => {
    expect(tenantBackTarget([PROPERTY_A, PROPERTY_B], PROPERTY_B)).toEqual({
      href: `/properties/${PROPERTY_B}?tab=leases`,
      label: "Back to Property Tenants / Leases",
    });
  });

  it("infers the Property when every visible Lease is at one Property (direct link)", () => {
    expect(tenantBackTarget([PROPERTY_A, PROPERTY_A], undefined).href).toBe(`/properties/${PROPERTY_A}?tab=leases`);
  });

  it("ignores an origin Property the Tenant has no visible Lease at", () => {
    expect(tenantBackTarget([PROPERTY_A], PROPERTY_B).href).toBe(`/properties/${PROPERTY_A}?tab=leases`);
    expect(tenantBackTarget([], PROPERTY_B).href).toBe("/tenants");
  });

  it("falls back to the Tenants list when the Property is ambiguous or unknown", () => {
    expect(tenantBackTarget([PROPERTY_A, PROPERTY_B], undefined).href).toBe("/tenants");
    expect(tenantBackTarget([], undefined).href).toBe("/tenants");
  });
});

describe("global parents", () => {
  it("sends Vendor, Asset and Admin User detail to their lists", () => {
    expect(GLOBAL_BACK_TARGETS.vendors.href).toBe("/vendors");
    expect(GLOBAL_BACK_TARGETS.assets.href).toBe("/assets");
    expect(GLOBAL_BACK_TARGETS.adminUsers).toEqual({ href: "/admin/users", label: "Back to Users & Access" });
  });

  it("only ever points inside the app", () => {
    for (const target of Object.values(GLOBAL_BACK_TARGETS)) {
      expect(target.href).toMatch(/^\/(?!\/)/);
    }
  });

  it("sends an edit screen back to the record it edits", () => {
    expect(editPageBackTarget("/vendors/v-1").href).toBe("/vendors/v-1");
  });
});
