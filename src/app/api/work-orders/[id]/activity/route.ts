import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";
import { listWorkOrderActivity } from "@/lib/work-orders/activity";
import { getAccessibleWorkOrder } from "@/lib/work-orders/work-order-access";

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

  // UNIT-OPS-1: another Unit's Work Order (and its notes/activity) is a 404.
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  const workOrder = await getAccessibleWorkOrder(user.organizationId, scope, id);
  if (!workOrder) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const activity = await listWorkOrderActivity(context.user.organizationId, id);
  return NextResponse.json({ activity });
}
