import { describe, expect, it } from "vitest";

import { canEditPropertyContact } from "./contacts";

const MANAGE = ["property.manage_contacts"];
const CREATE_ONLY = ["property.create_contact"];
const NONE: string[] = [];

describe("canEditPropertyContact", () => {
  it("lets a MANAGE_CONTACTS holder edit any contact, including legacy ones with no creator", () => {
    expect(canEditPropertyContact(MANAGE, { createdByUserId: null }, "user-1")).toBe(true);
    expect(canEditPropertyContact(MANAGE, { createdByUserId: "user-2" }, "user-1")).toBe(true);
  });

  it("lets a CREATE_CONTACT-only holder edit only a contact they created", () => {
    expect(canEditPropertyContact(CREATE_ONLY, { createdByUserId: "user-1" }, "user-1")).toBe(true);
    expect(canEditPropertyContact(CREATE_ONLY, { createdByUserId: "user-2" }, "user-1")).toBe(false);
  });

  it("denies a CREATE_CONTACT-only holder editing a legacy (creator-less) contact", () => {
    expect(canEditPropertyContact(CREATE_ONLY, { createdByUserId: null }, "user-1")).toBe(false);
  });

  it("denies a holder with neither capability", () => {
    expect(canEditPropertyContact(NONE, { createdByUserId: "user-1" }, "user-1")).toBe(false);
  });
});
