import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";
import { listWorkOrderActivity } from "@/lib/work-orders/activity";
import { getWorkOrder } from "@/lib/work-orders/work-orders";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const workOrder = await getWorkOrder(user.organizationId, id);
  if (!workOrder) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, workOrder.propertyId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const activity = await listWorkOrderActivity(context.user.organizationId, id);
  return NextResponse.json({ activity });
}
