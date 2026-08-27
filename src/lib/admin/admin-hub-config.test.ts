import { describe, expect, it } from "vitest";

import {
  ADMIN_CAPABILITIES,
  hasAnyAdminCapability,
  visibleAdminTiles,
} from "./admin-hub-config";

describe("visibleAdminTiles", () => {
  it("returns no tiles for a capability list with no admin grants", () => {
    expect(visibleAdminTiles([])).toEqual([]);
  });

  it("returns only the tile matching a single granted capability", () => {
    const tiles = visibleAdminTiles([ADMIN_CAPABILITIES.EMAIL]);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].id).toBe("email");
  });

  it("returns every tile when all capabilities are granted", () => {
    const tiles = visibleAdminTiles(Object.values(ADMIN_CAPABILITIES));
    expect(tiles.length).toBe(Object.values(ADMIN_CAPABILITIES).length);
  });

  it("ignores unrelated capability keys", () => {
    expect(visibleAdminTiles(["platform.admin"])).toEqual([]);
  });
});

describe("hasAnyAdminCapability", () => {
  it("is false for an empty grant list", () => {
    expect(hasAnyAdminCapability([])).toBe(false);
  });

  it("is true when at least one admin capability is granted", () => {
    expect(hasAnyAdminCapability([ADMIN_CAPABILITIES.FILES])).toBe(true);
  });
});
