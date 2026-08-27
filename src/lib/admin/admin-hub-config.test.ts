import { describe, expect, it } from "vitest";

import { PROPERTY_TYPE_CAPABILITIES } from "@/lib/properties/constants";

import { ADMIN_CAPABILITIES, ADMIN_TILES, hasAnyAdminCapability, visibleAdminTiles } from "./admin-hub-config";

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
