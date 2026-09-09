import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { preventiveMaintenanceOccurrences, preventiveMaintenancePlans, workOrders } from "@/db/schema";
import type { CalendarEvent } from "@/lib/calendar/types";

const TERMINAL_WORK_ORDER_STATUSES = new Set(["resolved", "closed", "cancelled"]);

export interface PmPlanDueRow {
  id: string;
  organizationId: string;
  propertyId: string;
  name: string;
  nextDueAt: string;
}

/**
 * Projects an active plan's next due date. Only ever the *not-yet-generated*
 * occurrence — once generated, the plan's own nextDueAt has already advanced
 * past this date (see generatePreventiveMaintenanceOccurrence), so this and
 * projectPmWorkOrderEvent below never describe the same due date twice.
 */
export function projectPmPlanDue(row: PmPlanDueRow, today: string): CalendarEvent {
  return {
    id: `preventive_maintenance_plan:${row.id}:${row.nextDueAt}`,
    organizationId: row.organizationId,
    sourceType: "preventive_maintenance",
    sourceId: row.id,
    category: "pm_due",
    title: `PM Due: ${row.name}`,
    startAt: row.nextDueAt,
    endAt: null,
    allDay: true,
    propertyId: row.propertyId,
    vendorId: null,
    assignedUserId: null,
    status: "due",
    statusLabel: "Due",
    overdue: row.nextDueAt < today,
    deepLinkUrl: `/preventive-maintenance/${row.id}`,
    metadata: { planId: row.id },
  };
}

export interface PmOccurrenceRow {
  occurrenceId: string;
  organizationId: string;
  propertyId: string;
  dueDate: string;
  planId: string;
  planName: string;
  workOrderId: string;
  workOrderNumber: string;
  workOrderSubject: string;
  workOrderStatus: string;
  workOrderAssignedUserId: string | null;
  workOrderVendorId: string | null;
  workOrderScheduledStartAt: Date | null;
  workOrderScheduledEndAt: Date | null;
}

/**
 * Projects a generated-but-not-yet-completed PM occurrence as the operational
 * event in place of its Work Order — see lib/calendar/projections/work-orders.ts,
 * which excludes source === 'preventive_maintenance' for exactly this reason.
 * Uses the Work Order's own schedule when set; otherwise falls back to the
 * occurrence's due date as an all-day event.
 */
export function projectPmWorkOrderEvent(row: PmOccurrenceRow, now: Date, today: string): CalendarEvent {
  const timed = row.workOrderScheduledStartAt !== null;
  const overdue = timed
    ? row.workOrderScheduledStartAt! < now && !TERMINAL_WORK_ORDER_STATUSES.has(row.workOrderStatus)
    : row.dueDate < today && !TERMINAL_WORK_ORDER_STATUSES.has(row.workOrderStatus);

  return {
    id: `preventive_maintenance_occurrence:${row.occurrenceId}`,
    organizationId: row.organizationId,
    sourceType: "preventive_maintenance",
    sourceId: row.occurrenceId,
    category: "pm_work_order",
    title: `${row.workOrderNumber}: ${row.planName}`,
    startAt: timed ? row.workOrderScheduledStartAt!.toISOString() : row.dueDate,
    endAt: row.workOrderScheduledEndAt ? row.workOrderScheduledEndAt.toISOString() : null,
    allDay: !timed,
    propertyId: row.propertyId,
    vendorId: row.workOrderVendorId,
    assignedUserId: row.workOrderAssignedUserId,
    status: row.workOrderStatus,
    statusLabel: row.workOrderStatus,
    overdue,
    deepLinkUrl: `/work-orders/${row.workOrderId}`,
    metadata: { planId: row.planId, workOrderId: row.workOrderId },
  };
}

export async function fetchPreventiveMaintenanceEvents(
  organizationId: string,
  now: Date,
  today: string,
): Promise<CalendarEvent[]> {
  const plans = await db
    .select({
      id: preventiveMaintenancePlans.id,
      organizationId: preventiveMaintenancePlans.organizationId,
      propertyId: preventiveMaintenancePlans.propertyId,
      name: preventiveMaintenancePlans.name,
      nextDueAt: preventiveMaintenancePlans.nextDueAt,
    })
    .from(preventiveMaintenancePlans)
    .where(
      and(
        eq(preventiveMaintenancePlans.organizationId, organizationId),
        eq(preventiveMaintenancePlans.isActive, true),
      ),
    );

  const occurrences = await db
    .select({
      occurrenceId: preventiveMaintenanceOccurrences.id,
      organizationId: preventiveMaintenanceOccurrences.organizationId,
      propertyId: preventiveMaintenanceOccurrences.propertyId,
      dueDate: preventiveMaintenanceOccurrences.dueDate,
      planId: preventiveMaintenancePlans.id,
      planName: preventiveMaintenancePlans.name,
      workOrderId: workOrders.id,
      workOrderNumber: workOrders.number,
      workOrderSubject: workOrders.subject,
      workOrderStatus: workOrders.status,
      workOrderAssignedUserId: workOrders.assignedUserId,
      workOrderVendorId: workOrders.vendorId,
      workOrderScheduledStartAt: workOrders.scheduledStartAt,
      workOrderScheduledEndAt: workOrders.scheduledEndAt,
    })
    .from(preventiveMaintenanceOccurrences)
    .innerJoin(
      preventiveMaintenancePlans,
      eq(preventiveMaintenancePlans.id, preventiveMaintenanceOccurrences.planId),
    )
    .innerJoin(workOrders, eq(workOrders.id, preventiveMaintenanceOccurrences.workOrderId))
    .where(
      and(
        eq(preventiveMaintenanceOccurrences.organizationId, organizationId),
        eq(preventiveMaintenanceOccurrences.status, "generated"),
      ),
    );

  return [
    ...plans.map((plan) => projectPmPlanDue(plan, today)),
    ...occurrences.map((occurrence) => projectPmWorkOrderEvent(occurrence, now, today)),
  ];
}
