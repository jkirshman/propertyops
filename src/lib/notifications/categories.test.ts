import { describe, expect, it } from "vitest";

import { NOTIFICATION_TYPES } from "./types";
import { categoryForNotificationType, isNotificationCategory, NOTIFICATION_CATEGORIES } from "./categories";

describe("categoryForNotificationType", () => {
  it("maps every gated notification type to a known category", () => {
    for (const [key, type] of Object.entries(NOTIFICATION_TYPES)) {
      if (key === "SYSTEM_TEST") continue;
      const category = categoryForNotificationType(type);
      expect(category, `expected a category for ${type}`).not.toBeNull();
      expect(isNotificationCategory(category!)).toBe(true);
    }
  });

  it("returns null for system.test (never gated by preferences)", () => {
    expect(categoryForNotificationType(NOTIFICATION_TYPES.SYSTEM_TEST)).toBeNull();
  });

  it("returns null for an unrecognized type", () => {
    expect(categoryForNotificationType("made_up.type")).toBeNull();
  });
});

describe("isNotificationCategory", () => {
  it("accepts every fixed category", () => {
    for (const category of NOTIFICATION_CATEGORIES) {
      expect(isNotificationCategory(category)).toBe(true);
    }
  });

  it("rejects an unrecognized/legacy value", () => {
    expect(isNotificationCategory("some_legacy_value")).toBe(false);
  });
});
