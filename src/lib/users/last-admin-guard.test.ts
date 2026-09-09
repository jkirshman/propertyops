import { describe, expect, it } from "vitest";

import { wouldLeaveOrgWithoutUserAdmin } from "./last-admin-guard";

describe("wouldLeaveOrgWithoutUserAdmin", () => {
  it("blocks deactivating the only user-admin", () => {
    expect(wouldLeaveOrgWithoutUserAdmin(["u1"], "u1")).toBe(true);
  });

  it("allows deactivating a user-admin when another remains", () => {
    expect(wouldLeaveOrgWithoutUserAdmin(["u1", "u2"], "u1")).toBe(false);
  });

  it("allows deactivating a user who isn't a user-admin at all", () => {
    expect(wouldLeaveOrgWithoutUserAdmin(["u1"], "u2")).toBe(false);
  });

  it("returns false for an empty admin list (target isn't one of them)", () => {
    expect(wouldLeaveOrgWithoutUserAdmin([], "u1")).toBe(false);
  });
});
