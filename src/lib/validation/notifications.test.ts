import { describe, expect, it } from "vitest";

import { createNotificationSchema } from "./notifications";

const VALID = {
  organizationId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5678",
  recipientUserId: "5b7f1e0a-9c1b-4a2e-8f0a-1c2d3e4f5679",
  type: "system.test",
  title: "Test notification",
};

describe("createNotificationSchema", () => {
  it("accepts a minimal valid notification", () => {
    expect(createNotificationSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing title", () => {
    const { organizationId, recipientUserId, type } = VALID;
    expect(
      createNotificationSchema.safeParse({ organizationId, recipientUserId, type }).success,
    ).toBe(false);
  });

  it("rejects a blank title after trimming", () => {
    expect(createNotificationSchema.safeParse({ ...VALID, title: "   " }).success).toBe(false);
  });

  it("rejects a non-uuid recipient", () => {
    expect(
      createNotificationSchema.safeParse({ ...VALID, recipientUserId: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("accepts optional fields when present", () => {
    const result = createNotificationSchema.safeParse({
      ...VALID,
      body: "Body text",
      deepLinkUrl: "/admin/notifications",
      dedupeKey: "system.test:daily",
      metadata: { source: "admin-hub" },
    });
    expect(result.success).toBe(true);
  });
});
