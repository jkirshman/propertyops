import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { createNotification } from "@/lib/notifications/notifications";
import { buildWorkOrderAssignedNotification } from "@/lib/work-orders/notification-events";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";
import { createWorkOrder, listWorkOrders } from "@/lib/work-orders/work-orders";
import { createWorkOrderSchema } from "@/lib/validation/work-orders";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const workOrders = await listWorkOrders(context.user.organizationId, {
    search: searchParams.get("search") ?? undefined,
    propertyId: searchParams.get("propertyId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    assignedUserId: searchParams.get("assignedUserId") ?? undefined,
  });

  return NextResponse.json({ workOrders });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const workOrder = await createWorkOrder(user.organizationId, user.id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "work_order.create",
    entityType: "work_order",
    entityId: workOrder.id,
    after: workOrder,
  });

  if (workOrder.assignedUserId && workOrder.assignedUserId !== user.id) {
    const notification = buildWorkOrderAssignedNotification(workOrder);
    await createNotification({
      organizationId: user.organizationId,
      recipientUserId: workOrder.assignedUserId,
      actorUserId: user.id,
      ...notification,
    });
  }

  return NextResponse.json({ workOrder }, { status: 201 });
}
