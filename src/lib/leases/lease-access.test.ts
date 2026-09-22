import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { canAccessPropertyUnit, type PropertyScope } from "@/lib/auth/property-access";
import { canAccessRelatedEntityPropertyContext } from "@/lib/files/related-entity-rules";

import { buildLeaseScopeCondition } from "./leases";

// UNIT-OPS-1 regression: Lease list, detail, and documents must agree.
// Detail/activity/edit use canAccessPropertyUnit(scope, propertyId, lease.propertyUnitId);
// documents use canAccessRelatedEntityPropertyContext; the list uses
// buildLeaseScopeCondition in SQL. Chosen rule: a NULL-unit Lease is
// Property-wide / Shared, visible to anyone with access to the Property.

const ST_JOE = "st-joe";
const FITNESS = "unit-fitness";
const RESTAURANT = "unit-restaurant";

const FITNESS_USER: Extract<PropertyScope, { kind: "scoped" }> = {
  kind: "scoped",
  access: [{ propertyId: ST_JOE, propertyUnitId: FITNESS }],
};
const WHOLE_ST_JOE: Extract<PropertyScope, { kind: "scoped" }> = {
  kind: "scoped",
  access: [{ propertyId: ST_JOE, propertyUnitId: null }],
};

const leaseRule = {
  detail: (scope: PropertyScope, unitId: string | null) => canAccessPropertyUnit(scope, ST_JOE, unitId),
  documents: (scope: PropertyScope, unitId: string | null) =>
    canAccessRelatedEntityPropertyContext(scope, { propertyId: ST_JOE, propertyUnitId: unitId }),
};

const renderCondition = (scope: Extract<PropertyScope, { kind: "scoped" }>) =>
  new PgDialect().sqlToQuery(buildLeaseScopeCondition(scope)!);

describe("Lease access: list, detail, and documents use one rule", () => {
  it("a Fitness Center Lease is visible to a Fitness Center User on detail and documents", () => {
    expect(leaseRule.detail(FITNESS_USER, FITNESS)).toBe(true);
    expect(leaseRule.documents(FITNESS_USER, FITNESS)).toBe(true);
  });

  it("a Restaurant Lease is hidden from a Fitness Center User on detail and documents", () => {
    expect(leaseRule.detail(FITNESS_USER, RESTAURANT)).toBe(false);
    expect(leaseRule.documents(FITNESS_USER, RESTAURANT)).toBe(false);
  });

  it("a NULL-unit Lease is Shared: visible on detail and documents to a Unit-restricted User", () => {
    expect(leaseRule.detail(FITNESS_USER, null)).toBe(true);
    expect(leaseRule.documents(FITNESS_USER, null)).toBe(true);
  });

  it("the list condition for a Unit-restricted row matches its own Unit OR a NULL Unit (the old list hid NULL-unit Leases)", () => {
    const { sql, params } = renderCondition(FITNESS_USER);
    expect(sql).toMatch(/"leases"\."property_unit_id" = \$\d/);
    expect(sql).toMatch(/"leases"\."property_unit_id" is null/);
    expect(params).toEqual([ST_JOE, FITNESS]);
  });

  it("the list condition for a whole-Property row matches the whole Property", () => {
    const { sql, params } = renderCondition(WHOLE_ST_JOE);
    expect(sql).not.toContain("property_unit_id");
    expect(params).toEqual([ST_JOE]);
  });

  it("no access rows means no list condition at all (callers return [] without querying)", () => {
    expect(buildLeaseScopeCondition({ kind: "scoped", access: [] })).toBeNull();
  });
});
