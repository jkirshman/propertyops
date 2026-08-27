import { describe, expect, it } from "vitest";

import {
  buildWorkOrderAssignedNotification,
  buildWorkOrderClosedNotification,
  buildWorkOrderResolvedNotification,
} from "./notification-events";

const WORK_ORDER = { id: "wo-1", number: "WO-000042", subject: "Leaking faucet" };

describe("work order notification events", () => {
  it("builds an assignment notification with a deep link to the work order", () => {
    const notification = buildWorkOrderAssignedNotification(WORK_ORDER);
    expect(notification.type).toBe("work_order.assigned");
    expect(notification.title).toContain("WO-000042");
    expect(notification.deepLinkUrl).toBe("/work-orders/wo-1");
    expect(notification.relatedEntityId).toBe("wo-1");
  });

  it("builds a resolved notification", () => {
    const notification = buildWorkOrderResolvedNotification(WORK_ORDER);
    expect(notification.type).toBe("work_order.resolved");
    expect(notification.title).toBe("Resolved: WO-000042");
  });

  it("builds a closed notification", () => {
    const notification = buildWorkOrderClosedNotification(WORK_ORDER);
    expect(notification.type).toBe("work_order.closed");
    expect(notification.title).toBe("Closed: WO-000042");
  });

  it("carries the subject as the notification body for all event types", () => {
    expect(buildWorkOrderAssignedNotification(WORK_ORDER).body).toBe("Leaking faucet");
    expect(buildWorkOrderResolvedNotification(WORK_ORDER).body).toBe("Leaking faucet");
    expect(buildWorkOrderClosedNotification(WORK_ORDER).body).toBe("Leaking faucet");
  });
});
