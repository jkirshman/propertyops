import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { generatePreventiveMaintenanceOccurrence } from "@/lib/preventive-maintenance/occurrences";
import { getPreventiveMaintenancePlan } from "@/lib/preventive-maintenance/plans";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.GENERATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const plan = await getPreventiveMaintenancePlan(user.organizationId, id);
  if (!plan) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Manual "Generate Due Work Order" always targets the plan's current
  // scheduled occurrence — it does not require the due date to have passed —
  // but never alters the recurrence cadence itself.
  const result = await generatePreventiveMaintenanceOccurrence(user.organizationId, plan, {
    triggeredByUserId: user.id,
  });

  if (result.status === "skipped") {
    return NextResponse.json({ status: "skipped", reason: result.reason }, { status: 409 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "preventive_maintenance_plan.manual_generate",
    entityType: "preventive_maintenance_plan",
    entityId: id,
    after: { workOrderId: result.workOrder.id, dueDate: result.occurrence.dueDate },
  });

  return NextResponse.json({ status: "generated", workOrder: result.workOrder, plan: result.plan });
}
