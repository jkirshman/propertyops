import { describe, expect, it } from "vitest";

import { planArchiveTransition } from "./archive-rules";
import {
  PROPERTY_LIFECYCLE_FILTER_LABELS,
  PROPERTY_LIFECYCLE_LABELS,
  availableLifecycleAction,
  buildMainPropertiesListQuery,
  lifecycleFilterToIsActive,
  parsePropertyLifecycleFilter,
  propertyLifecycleStatus,
} from "./lifecycle-views";

// Mirrors listProperties' isActive condition (eq(properties.isActive, value)
// when defined) so list membership can be asserted without a database.
function applyIsActive<T extends { isActive: boolean }>(rows: T[], isActive: boolean | undefined): T[] {
  return isActive === undefined ? rows : rows.filter((row) => row.isActive === isActive);
}

const ACTIVE = { id: "a", isActive: true };
const ARCHIVED = { id: "b", isActive: false };
const ROWS = [ACTIVE, ARCHIVED];

function mainListIsActive(): boolean | undefined {
  const active = buildMainPropertiesListQuery({}).get("active");
  return active === "true" ? true : active === "false" ? false : undefined;
}

describe("main Properties list", () => {
  it("shows an active Property and hides an archived one", () => {
    expect(applyIsActive(ROWS, mainListIsActive()).map((row) => row.id)).toEqual(["a"]);
  });

  it("always requests active=true, whatever other filters are set", () => {
    const params = buildMainPropertiesListQuery({ search: "  oak ", propertyTypeId: "t1", propertyCompanyId: "unassigned" });
    expect(params.get("active")).toBe("true");
    expect(params.get("search")).toBe("oak");
    expect(params.get("propertyTypeId")).toBe("t1");
    expect(params.get("propertyCompanyId")).toBe("unassigned");
  });

  it("has no lifecycle option that exposes archived records", () => {
    // The builder accepts no lifecycle input at all; extra keys are ignored.
    const params = buildMainPropertiesListQuery({ status: "archived", active: "false" } as never);
    expect(params.getAll("active")).toEqual(["true"]);
    expect(params.has("status")).toBe(false);
  });

  it("is empty for a User whose only accessible Property is archived", () => {
    expect(applyIsActive([ARCHIVED], mainListIsActive())).toEqual([]);
  });
});

describe("Admin → Properties filter", () => {
  it("defaults to All and falls back to All for unknown values", () => {
    expect(parsePropertyLifecycleFilter(null)).toBe("all");
    expect(parsePropertyLifecycleFilter(undefined)).toBe("all");
    expect(parsePropertyLifecycleFilter("inactive")).toBe("all");
    expect(parsePropertyLifecycleFilter("archived")).toBe("archived");
    expect(parsePropertyLifecycleFilter("active")).toBe("active");
  });

  it("All shows active and archived Properties", () => {
    expect(applyIsActive(ROWS, lifecycleFilterToIsActive("all")).map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("Active shows only active Properties", () => {
    expect(applyIsActive(ROWS, lifecycleFilterToIsActive("active")).map((row) => row.id)).toEqual(["a"]);
  });

  it("Archived shows only archived Properties", () => {
    expect(applyIsActive(ROWS, lifecycleFilterToIsActive("archived")).map((row) => row.id)).toEqual(["b"]);
  });

  it("labels filters All / Active / Archived — never Inactive", () => {
    expect(Object.values(PROPERTY_LIFECYCLE_FILTER_LABELS)).toEqual(["All", "Active", "Archived"]);
  });
});

describe("lifecycle status and action", () => {
  it("maps is_active to Active / Archived", () => {
    expect(PROPERTY_LIFECYCLE_LABELS[propertyLifecycleStatus(ACTIVE)]).toBe("Active");
    expect(PROPERTY_LIFECYCLE_LABELS[propertyLifecycleStatus(ARCHIVED)]).toBe("Archived");
  });

  it("offers Archive only for Active and Restore only for Archived", () => {
    expect(availableLifecycleAction(ACTIVE)).toBe("archive");
    expect(availableLifecycleAction(ARCHIVED)).toBe("restore");
  });
});

describe("archive / restore round trip on the main list", () => {
  it("an archived Property disappears and a restored one reappears", () => {
    const archive = planArchiveTransition(ACTIVE, "archive");
    expect(archive.ok).toBe(true);
    const archived = { ...ACTIVE, isActive: archive.ok ? archive.isActive : true };
    expect(applyIsActive([archived], mainListIsActive())).toEqual([]);
    expect(applyIsActive([archived], lifecycleFilterToIsActive("archived"))).toEqual([archived]);

    const restore = planArchiveTransition(archived, "restore");
    expect(restore.ok).toBe(true);
    const restored = { ...archived, isActive: restore.ok ? restore.isActive : false };
    expect(applyIsActive([restored], mainListIsActive())).toEqual([restored]);
  });
});
