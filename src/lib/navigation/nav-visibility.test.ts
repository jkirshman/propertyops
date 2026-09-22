import { describe, expect, it } from "vitest";

import { resolveNavVariant } from "./nav-visibility";

// Representative subsets copied from scripts/seed.ts's MANAGER_CAPABILITY_KEYS
// / USER_CAPABILITY_KEYS — not invented capability sets.
const ADMIN_CAPABILITIES = ["platform.admin", "users.manage", "property.view", "property.edit"];
const MANAGER_CAPABILITIES = [
  "property.view",
  "property.edit",
  "property.manage_contacts",
  "work_order.view",
  "work_order.create",
  "vendor.view",
  "vendor.create",
];
const USER_CAPABILITIES = [
  "property.view",
  "property.manage_notes",
  "property.create_contact",
  "work_order.view",
  "work_order.create",
  "vendor.view",
  "vendor.submit",
];

describe("resolveNavVariant", () => {
  it("returns 'admin' for any capability set with an Admin Hub capability", () => {
    expect(resolveNavVariant(ADMIN_CAPABILITIES)).toBe("admin");
  });

  it("returns 'manager' for a capability set with property.edit but no admin capability", () => {
    expect(resolveNavVariant(MANAGER_CAPABILITIES)).toBe("manager");
  });

  it("returns 'user' for a capability set with neither admin nor property.edit", () => {
    expect(resolveNavVariant(USER_CAPABILITIES)).toBe("user");
  });

  it("fails toward the simplest experience for an empty capability set", () => {
    expect(resolveNavVariant([])).toBe("user");
  });
});
