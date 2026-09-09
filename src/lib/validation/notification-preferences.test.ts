import { describe, expect, it } from "vitest";

import { updateNotificationPreferenceSchema } from "./notification-preferences";

describe("updateNotificationPreferenceSchema", () => {
  it("accepts inAppEnabled alone", () => {
    expect(updateNotificationPreferenceSchema.safeParse({ inAppEnabled: false }).success).toBe(true);
  });

  it("accepts emailEnabled alone", () => {
    expect(updateNotificationPreferenceSchema.safeParse({ emailEnabled: false }).success).toBe(true);
  });

  it("accepts both", () => {
    expect(
      updateNotificationPreferenceSchema.safeParse({ inAppEnabled: true, emailEnabled: false }).success,
    ).toBe(true);
  });

  it("rejects an empty body", () => {
    expect(updateNotificationPreferenceSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-boolean value", () => {
    expect(updateNotificationPreferenceSchema.safeParse({ inAppEnabled: "yes" }).success).toBe(false);
  });
});
