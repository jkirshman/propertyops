import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { createNotification } from "@/lib/notifications/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

export async function POST() {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.NOTIFICATIONS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { user } = context;

  const notification = await createNotification({
    organizationId: user.organizationId,
    recipientUserId: user.id,
    actorUserId: user.id,
    type: NOTIFICATION_TYPES.SYSTEM_TEST,
    title: "Test notification",
    body: "This notification confirms the notification core is working.",
    deepLinkUrl: "/admin/notifications",
  });

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "notification.test_send",
    entityType: "notification",
    entityId: notification?.id ?? "skipped",
  });

  return NextResponse.json({ notification });
}
