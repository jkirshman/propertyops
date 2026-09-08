import { and, desc, eq } from "drizzle-orm";

import { recordAuditEvent } from "@/db/audit";
import { db } from "@/db/client";
import { preventiveMaintenanceOccurrences, preventiveMaintenancePlans, workOrders } from "@/db/schema";
import { createNotification } from "@/lib/notifications/notifications";
import type { WorkOrderPriority, WorkOrderSource, WorkOrderStatus } from "@/lib/work-orders/constants";
import { createWorkOrder } from "@/lib/work-orders/work-orders";

import { mapWorkOrderStatusToOccurrenceStatus } from "./occurrence-status";
import {
  buildPmWorkOrderCompletedNotification,
  buildPmWorkOrderGeneratedNotification,
} from "./notification-events";
import { computeNextDueDate, todayDateString } from "./recurrence";
import type { PreventiveMaintenancePlanRow } from "./plans";

const PM_WORK_ORDER_SOURCE: WorkOrderSource = "preventive_maintenance";

export type PreventiveMaintenanceOccurrenceRow = typeof preventiveMaintenanceOccurrences.$inferSelect;

export async function listOccurrencesForPlan(organizationId: string, planId: string) {
  return db
    .select({
      id: preventiveMaintenanceOccurrences.id,
      dueDate: preventiveMaintenanceOccurrences.dueDate,
      status: preventiveMaintenanceOccurrences.status,
      generatedAt: preventiveMaintenanceOccurrences.generatedAt,
      generatedByUserId: preventiveMaintenanceOccurrences.generatedByUserId,
      completedAt: preventiveMaintenanceOccurrences.completedAt,
      cancelledAt: preventiveMaintenanceOccurrences.cancelledAt,
      workOrderId: preventiveMaintenanceOccurrences.workOrderId,
      workOrderNumber: workOrders.number,
      workOrderStatus: workOrders.status,
    })
    .from(preventiveMaintenanceOccurrences)
    .leftJoin(workOrders, eq(workOrders.id, preventiveMaintenanceOccurrences.workOrderId))
    .where(
      and(
        eq(preventiveMaintenanceOccurrences.organizationId, organizationId),
        eq(preventiveMaintenanceOccurrences.planId, planId),
      ),
    )
    .orderBy(desc(preventiveMaintenanceOccurrences.dueDate));
}

export type GeneratePreventiveMaintenanceResult =
  | {
      status: "generated";
      workOrder: typeof workOrders.$inferSelect;
      occurrence: PreventiveMaintenanceOccurrenceRow;
      plan: PreventiveMaintenancePlanRow;
    }
  | { status: "skipped"; reason: "inactive" | "not_due" | "already_generated" };

/**
 * The single work-order-generation service used by both the daily cron and the
 * manual "Generate Due Work Order" action. Idempotency is enforced by the
 * unique (planId, dueDate) index on preventive_maintenance_occurrences: only
 * the request that wins that insert goes on to create a Work Order.
 */
export async function generatePreventiveMaintenanceOccurrence(
  organizationId: string,
  plan: PreventiveMaintenancePlanRow,
  options: { requireDue?: boolean; triggeredByUserId?: string | null } = {},
): Promise<GeneratePreventiveMaintenanceResult> {
  if (!plan.isActive) {
    return { status: "skipped", reason: "inactive" };
  }

  if (options.requireDue && plan.nextDueAt > todayDateString()) {
    return { status: "skipped", reason: "not_due" };
  }

  const [inserted] = await db
    .insert(preventiveMaintenanceOccurrences)
    .values({
      organizationId,
      planId: plan.id,
      propertyId: plan.propertyId,
      dueDate: plan.nextDueAt,
      generatedByUserId: options.triggeredByUserId ?? null,
    })
    .onConflictDoNothing({
      target: [preventiveMaintenanceOccurrences.planId, preventiveMaintenanceOccurrences.dueDate],
    })
    .returning();

  let occurrence = inserted;

  if (!occurrence) {
    // Either this due date is already fully generated, or a previous attempt
    // was interrupted after reserving the occurrence but before linking a
    // work order (no transactions on the neon-http driver — see PROP-6 known
    // limitations). Repair the latter instead of silently skipping it.
    const [existing] = await db
      .select()
      .from(preventiveMaintenanceOccurrences)
      .where(
        and(
          eq(preventiveMaintenanceOccurrences.planId, plan.id),
          eq(preventiveMaintenanceOccurrences.dueDate, plan.nextDueAt),
        ),
      )
      .limit(1);

    if (!existing || existing.workOrderId) {
      return { status: "skipped", reason: "already_generated" };
    }
    occurrence = existing;
  }

  const workOrder = await createWorkOrder(
    organizationId,
    options.triggeredByUserId ?? null,
    {
      propertyId: plan.propertyId,
      propertyEquipmentId: plan.propertyEquipmentId ?? undefined,
      categoryId: plan.categoryId,
      subject: plan.name,
      description: plan.instructions ?? plan.description ?? undefined,
      priority: plan.defaultPriority as WorkOrderPriority,
      assignedUserId: plan.defaultAssigneeUserId ?? undefined,
      // Default assignment only — never dispatches or contacts the vendor.
      vendorId: plan.defaultVendorId ?? undefined,
    },
    { source: PM_WORK_ORDER_SOURCE },
  );

  const [updatedOccurrence] = await db
    .update(preventiveMaintenanceOccurrences)
    .set({ workOrderId: workOrder.id })
    .where(eq(preventiveMaintenanceOccurrences.id, occurrence.id))
    .returning();

  const nextDueAt = computeNextDueDate(occurrence.dueDate, plan.intervalUnit as "week" | "month", plan.intervalValue);

  const [updatedPlan] = await db
    .update(preventiveMaintenancePlans)
    .set({ nextDueAt, lastGeneratedAt: new Date(), updatedAt: new Date() })
    .where(eq(preventiveMaintenancePlans.id, plan.id))
    .returning();

  await recordAuditEvent({
    organizationId,
    actorUserId: options.triggeredByUserId ?? null,
    action: "preventive_maintenance_plan.occurrence_generated",
    entityType: "preventive_maintenance_plan",
    entityId: plan.id,
    before: { nextDueAt: plan.nextDueAt },
    after: {
      workOrderId: workOrder.id,
      dueDate: occurrence.dueDate,
      nextDueAt,
      manual: Boolean(options.triggeredByUserId),
    },
  });

  if (plan.defaultAssigneeUserId) {
    await createNotification({
      organizationId,
      recipientUserId: plan.defaultAssigneeUserId,
      actorUserId: options.triggeredByUserId ?? undefined,
      ...buildPmWorkOrderGeneratedNotification(workOrder, plan.name),
    });
  }

  return { status: "generated", workOrder, occurrence: updatedOccurrence, plan: updatedPlan };
}

/**
 * Called whenever a work order's status changes. No-ops for work orders that
 * aren't linked to a PM occurrence. Never touches Equipment Service History.
 */
export async function syncPreventiveMaintenanceOccurrenceStatus(
  organizationId: string,
  workOrder: { id: string; number: string; subject: string; status: WorkOrderStatus },
  actorUserId: string | null,
): Promise<void> {
  const [occurrence] = await db
    .select()
    .from(preventiveMaintenanceOccurrences)
    .where(
      and(
        eq(preventiveMaintenanceOccurrences.organizationId, organizationId),
        eq(preventiveMaintenanceOccurrences.workOrderId, workOrder.id),
      ),
    )
    .limit(1);

  if (!occurrence) {
    return;
  }

  const nextStatus = mapWorkOrderStatusToOccurrenceStatus(workOrder.status);
  if (nextStatus === occurrence.status) {
    return;
  }

  const now = new Date();
  await db
    .update(preventiveMaintenanceOccurrences)
    .set({
      status: nextStatus,
      ...(nextStatus === "completed" && !occurrence.completedAt ? { completedAt: now } : {}),
      ...(nextStatus === "cancelled" && !occurrence.cancelledAt ? { cancelledAt: now } : {}),
    })
    .where(eq(preventiveMaintenanceOccurrences.id, occurrence.id));

  await recordAuditEvent({
    organizationId,
    actorUserId,
    action: `preventive_maintenance_plan.occurrence_${nextStatus}`,
    entityType: "preventive_maintenance_plan",
    entityId: occurrence.planId,
    before: { status: occurrence.status },
    after: { status: nextStatus, workOrderId: workOrder.id },
  });

  if (nextStatus !== "completed") {
    return;
  }

  const [plan] = await db
    .update(preventiveMaintenancePlans)
    .set({ lastCompletedAt: now, updatedAt: now })
    .where(eq(preventiveMaintenancePlans.id, occurrence.planId))
    .returning();

  if (plan?.defaultAssigneeUserId && plan.defaultAssigneeUserId !== actorUserId) {
    await createNotification({
      organizationId,
      recipientUserId: plan.defaultAssigneeUserId,
      actorUserId: actorUserId ?? undefined,
      ...buildPmWorkOrderCompletedNotification(workOrder),
    });
  }
}
