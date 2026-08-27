import { describe, expect, it } from "vitest";

import { stripUndefined } from "./strip-undefined";

describe("stripUndefined", () => {
  it("removes undefined-valued keys", () => {
    expect(stripUndefined({ a: 1, b: undefined, c: "x" })).toEqual({ a: 1, c: "x" });
  });

  it("keeps null values (distinct from undefined)", () => {
    expect(stripUndefined({ a: null, b: undefined })).toEqual({ a: null });
  });

  it("keeps falsy-but-defined values", () => {
    expect(stripUndefined({ a: 0, b: false, c: "" })).toEqual({ a: 0, b: false, c: "" });
  });

  it("returns an empty object when everything is undefined", () => {
    expect(stripUndefined({ a: undefined })).toEqual({});
  });
});
