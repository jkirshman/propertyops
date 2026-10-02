import { describe, expect, it } from "vitest";

import { PROPERTY_CAPABILITIES, PROPERTY_TYPE_CAPABILITIES } from "@/lib/properties/constants";

import {
  ADMIN_CAPABILITIES,
  ADMIN_TILES,
  canManagePropertyLifecycle,
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

  it("returns every tile when every tile's required capability is granted", () => {
    const allCapabilities = ADMIN_TILES.map((tile) => tile.requiredCapability);
    const tiles = visibleAdminTiles(allCapabilities);
    expect(tiles.length).toBe(ADMIN_TILES.length);
  });

  it("ignores unrelated capability keys", () => {
    expect(visibleAdminTiles(["platform.admin"])).toEqual([]);
  });

  it("gates the Property Types tile behind property_type.manage", () => {
    const tiles = visibleAdminTiles([PROPERTY_TYPE_CAPABILITIES.MANAGE]);
    expect(tiles.map((tile) => tile.id)).toEqual(["property-types"]);
  });

  it("does not surface Property Types for property_type.view alone", () => {
    const tiles = visibleAdminTiles([PROPERTY_TYPE_CAPABILITIES.VIEW]);
    expect(tiles.some((tile) => tile.id === "property-types")).toBe(false);
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

describe("LIFECYCLE-1A: Admin → Properties tile", () => {
  const ids = (keys: string[]) => visibleAdminTiles(keys).map((tile) => tile.id);

  it("is shown to an admin with Admin Hub access and property.edit", () => {
    expect(ids([ADMIN_CAPABILITIES.USERS, PROPERTY_CAPABILITIES.EDIT])).toContain("properties");
    expect(canManagePropertyLifecycle([ADMIN_CAPABILITIES.USERS, PROPERTY_CAPABILITIES.EDIT])).toBe(true);
  });

  it("is hidden from a Manager (property.edit alone) and grants no Admin Hub access", () => {
    expect(ids([PROPERTY_CAPABILITIES.EDIT])).toEqual([]);
    expect(hasAnyAdminCapability([PROPERTY_CAPABILITIES.EDIT])).toBe(false);
    expect(canManagePropertyLifecycle([PROPERTY_CAPABILITIES.EDIT])).toBe(false);
  });

  it("is hidden from an admin without property.edit", () => {
    expect(ids([ADMIN_CAPABILITIES.USERS])).not.toContain("properties");
    expect(canManagePropertyLifecycle([ADMIN_CAPABILITIES.USERS])).toBe(false);
  });
});
