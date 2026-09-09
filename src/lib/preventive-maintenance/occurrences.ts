import { and, desc, eq } from "drizzle-orm";

import { recordAuditEvent } from "@/db/audit";
import { db } from "@/db/client";
import { preventiveMaintenanceOccurrences, preventiveMaintenancePlans, users, workOrders } from "@/db/schema";
import { createNotification } from "@/lib/notifications/notifications";
import type { WorkOrderPriority, WorkOrderSource, WorkOrderStatus } from "@/lib/work-orders/constants";
import { createWorkOrder } from "@/lib/work-orders/work-orders";

import { isNonTerminalWorkOrderStatus, mapWorkOrderStatusToOccurrenceStatus } from "./occurrence-status";
import {
  buildPmWorkOrderCompletedNotification,
  buildPmWorkOrderGeneratedNotification,
} from "./notification-events";
import { computeNextDueDate, todayDateString } from "./recurrence";
import type { PreventiveMaintenancePlanRow } from "./plans";

const PM_WORK_ORDER_SOURCE: WorkOrderSource = "preventive_maintenance";

// How long an occurrence can sit unlinked to a Work Order before a later
// request is allowed to treat it as abandoned (crashed mid-generation) rather
// than still in flight. Far longer than any real double-click or concurrent
// request, short enough that a genuinely interrupted generation is repaired
// promptly.
const ABANDONED_OCCURRENCE_REPAIR_DELAY_MS = 30_000;

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

export interface OpenPmWorkOrderInfo {
  occurrenceId: string;
  workOrder: {
    id: string;
    number: string;
    status: WorkOrderStatus;
    assignedUserId: string | null;
    assigneeName: string | null;
  };
}

export type GeneratePreventiveMaintenanceResult =
  | {
      status: "generated";
      workOrder: typeof workOrders.$inferSelect;
      occurrence: PreventiveMaintenanceOccurrenceRow;
      plan: PreventiveMaintenancePlanRow;
    }
  | { status: "skipped"; reason: "inactive" | "not_due" | "already_generated" }
  | { status: "blocked"; openWorkOrder: OpenPmWorkOrderInfo["workOrder"] };

/**
 * The plan's most recent occurrence that has a linked Work Order, with that
 * Work Order's *current* status/assignee joined live (never trusting the
 * occurrence's own cached status column, which is only refreshed when a Work
 * Order transition happens to route through the sync path). Returns null when
 * the plan has never generated a Work Order. Callers decide blocking via
 * `isNonTerminalWorkOrderStatus` on the returned status.
 */
export async function getOpenPmWorkOrderForPlan(
  organizationId: string,
  planId: string,
): Promise<OpenPmWorkOrderInfo | null> {
  const [row] = await db
    .select({
      occurrenceId: preventiveMaintenanceOccurrences.id,
      workOrderId: workOrders.id,
      workOrderNumber: workOrders.number,
      workOrderStatus: workOrders.status,
      assignedUserId: workOrders.assignedUserId,
      assigneeName: users.displayName,
    })
    .from(preventiveMaintenanceOccurrences)
    .innerJoin(workOrders, eq(workOrders.id, preventiveMaintenanceOccurrences.workOrderId))
    .leftJoin(users, eq(users.id, workOrders.assignedUserId))
    .where(
      and(
        eq(preventiveMaintenanceOccurrences.organizationId, organizationId),
        eq(preventiveMaintenanceOccurrences.planId, planId),
      ),
    )
    .orderBy(desc(preventiveMaintenanceOccurrences.dueDate), desc(preventiveMaintenanceOccurrences.generatedAt))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    occurrenceId: row.occurrenceId,
    workOrder: {
      id: row.workOrderId,
      number: row.workOrderNumber,
      status: row.workOrderStatus as WorkOrderStatus,
      assignedUserId: row.assignedUserId,
      assigneeName: row.assigneeName,
    },
  };
}

export type GenerationGateResult =
  | { blocked: false }
  | { blocked: true; openWorkOrder: OpenPmWorkOrderInfo["workOrder"] };

/**
 * Pure decision of whether a plan's most recent PM Work Order should block a
 * new generation. A candidate only blocks when it is still non-terminal *and*
 * the caller hasn't already passed the explicit "Generate Another Work Order"
 * confirmation — a terminal (resolved/closed/cancelled) candidate never
 * blocks, confirmed or not.
 */
export function resolveGenerationGate(
  candidate: OpenPmWorkOrderInfo | null,
  confirmDuplicate: boolean,
): GenerationGateResult {
  if (candidate && isNonTerminalWorkOrderStatus(candidate.workOrder.status) && !confirmDuplicate) {
    return { blocked: true, openWorkOrder: candidate.workOrder };
  }
  return { blocked: false };
}

/**
 * The single work-order-generation service used by both the daily cron and the
 * manual "Generate Due Work Order" action. Idempotency is enforced by the
 * unique (planId, dueDate) index on preventive_maintenance_occurrences: only
 * the request that wins that insert goes on to create a Work Order.
 */
export async function generatePreventiveMaintenanceOccurrence(
  organizationId: string,
  plan: PreventiveMaintenancePlanRow,
  options: { requireDue?: boolean; triggeredByUserId?: string | null; confirmDuplicate?: boolean } = {},
): Promise<GeneratePreventiveMaintenanceResult> {
  if (!plan.isActive) {
    return { status: "skipped", reason: "inactive" };
  }

  if (options.requireDue && plan.nextDueAt > todayDateString()) {
    return { status: "skipped", reason: "not_due" };
  }

  const openCandidate = await getOpenPmWorkOrderForPlan(organizationId, plan.id);
  const gate = resolveGenerationGate(openCandidate, Boolean(options.confirmDuplicate));
  if (gate.blocked) {
    await recordAuditEvent({
      organizationId,
      actorUserId: options.triggeredByUserId ?? null,
      action: "preventive_maintenance_plan.occurrence_generation_blocked",
      entityType: "preventive_maintenance_plan",
      entityId: plan.id,
      after: {
        workOrderId: gate.openWorkOrder.id,
        workOrderNumber: gate.openWorkOrder.number,
        workOrderStatus: gate.openWorkOrder.status,
      },
    });
    return { status: "blocked", openWorkOrder: gate.openWorkOrder };
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
    // limitations). Repair the latter instead of silently skipping it — but
    // only once the other attempt has had time to finish on its own. Without
    // this delay, two near-simultaneous requests (a double-click, or a
    // manual click racing the cron) both lose the insert, both see the same
    // still-unlinked row, and both "repair" it — creating two Work Orders for
    // one occurrence. Treating a *recent* unlinked row as still in flight
    // (and skipping instead of repairing) closes that window while still
    // recovering a genuinely abandoned occurrence after the fact.
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

    const isAbandoned =
      existing !== undefined &&
      !existing.workOrderId &&
      Date.now() - existing.generatedAt.getTime() > ABANDONED_OCCURRENCE_REPAIR_DELAY_MS;

    if (!existing || existing.workOrderId || !isAbandoned) {
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
      duplicateConfirmed: Boolean(options.confirmDuplicate),
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
