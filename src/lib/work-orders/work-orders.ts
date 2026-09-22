import { and, desc, eq, getTableColumns, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { properties, propertyUnits, workOrderCounters, workOrders } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import { formatWorkOrderNumber } from "@/lib/work-orders/numbering";
import { WORK_ORDER_NON_TERMINAL_STATUSES } from "@/lib/work-orders/constants";
import type { CreateWorkOrderInput, UpdateWorkOrderInput } from "@/lib/validation/work-orders";

async function getNextWorkOrderSequenceNumber(organizationId: string): Promise<number> {
  // Lazily create the counter row (first-ever work order for this org); a
  // concurrent duplicate insert is a safe no-op, and the atomic UPDATE below
  // still serializes correctly against whichever row wins.
  await db.insert(workOrderCounters).values({ organizationId }).onConflictDoNothing();

  const [row] = await db
    .update(workOrderCounters)
    .set({ nextNumber: sql`${workOrderCounters.nextNumber} + 1` })
    .where(eq(workOrderCounters.organizationId, organizationId))
    .returning({ nextNumber: workOrderCounters.nextNumber });

  return row.nextNumber - 1;
}

export interface ListWorkOrdersOptions {
  search?: string;
  propertyId?: string;
  propertyEquipmentId?: string;
  propertyComponentId?: string;
  assetId?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  assignedUserId?: string;
  vendorId?: string;
  /** ACCESS-1: when provided and not null, results are limited to these Property ids. */
  propertyIds?: string[] | null;
}

export async function listWorkOrders(organizationId: string, options: ListWorkOrdersOptions = {}) {
  const conditions = [eq(workOrders.organizationId, organizationId)];

  if (options.propertyId) {
    conditions.push(eq(workOrders.propertyId, options.propertyId));
  }
  if (options.propertyIds !== undefined && options.propertyIds !== null) {
    if (options.propertyIds.length === 0) return [];
    conditions.push(inArray(workOrders.propertyId, options.propertyIds));
  }
  if (options.propertyEquipmentId) {
    conditions.push(eq(workOrders.propertyEquipmentId, options.propertyEquipmentId));
  }
  if (options.propertyComponentId) {
    conditions.push(eq(workOrders.propertyComponentId, options.propertyComponentId));
  }
  if (options.assetId) {
    conditions.push(eq(workOrders.assetId, options.assetId));
  }
  if (options.status) {
    conditions.push(eq(workOrders.status, options.status));
  }
  if (options.priority) {
    conditions.push(eq(workOrders.priority, options.priority));
  }
  if (options.categoryId) {
    conditions.push(eq(workOrders.categoryId, options.categoryId));
  }
  if (options.assignedUserId) {
    conditions.push(eq(workOrders.assignedUserId, options.assignedUserId));
  }
  if (options.vendorId) {
    conditions.push(eq(workOrders.vendorId, options.vendorId));
  }
  if (options.search) {
    const term = `%${options.search.trim()}%`;
    conditions.push(or(ilike(workOrders.subject, term), ilike(workOrders.number, term))!);
  }

  // UNIT-OPS-1: carries the owning Unit's label so lists can show
  // "Fitness Center" / "Property-wide" without a second round trip.
  // Property-scoped only — callers apply filterAccessibleWorkOrders.
  return db
    .select({
      ...getTableColumns(workOrders),
      unitLabel: propertyUnits.unitLabel,
      unitIsActive: propertyUnits.isActive,
    })
    .from(workOrders)
    .leftJoin(propertyUnits, eq(propertyUnits.id, workOrders.propertyUnitId))
    .where(and(...conditions))
    .orderBy(desc(workOrders.updatedAt));
}

// Powers the Home App Brief's Overdue / High-Urgent Work Orders sections
// (Property-scoped here; the brief applies filterAccessibleWorkOrders) —
// listWorkOrders' status filter only supports a single exact value, not "any
// non-terminal status," so this is a dedicated query rather than a reuse.
export async function listOpenWorkOrdersForBrief(
  organizationId: string,
  // ACCESS-1: null/omitted = unrestricted; an array scopes to those
  // properties; an empty array short-circuits to no rows.
  propertyIds?: string[] | null,
) {
  if (propertyIds !== undefined && propertyIds !== null && propertyIds.length === 0) {
    return [];
  }

  const conditions = [
    eq(workOrders.organizationId, organizationId),
    inArray(workOrders.status, WORK_ORDER_NON_TERMINAL_STATUSES),
  ];
  if (propertyIds !== undefined && propertyIds !== null) {
    conditions.push(inArray(workOrders.propertyId, propertyIds));
  }

  return db
    .select({
      id: workOrders.id,
      number: workOrders.number,
      subject: workOrders.subject,
      priority: workOrders.priority,
      status: workOrders.status,
      openedAt: workOrders.openedAt,
      propertyId: workOrders.propertyId,
      propertyUnitId: workOrders.propertyUnitId,
      propertyName: properties.name,
    })
    .from(workOrders)
    .innerJoin(properties, eq(properties.id, workOrders.propertyId))
    .where(and(...conditions))
    .orderBy(workOrders.openedAt);
}

export async function getWorkOrder(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(workOrders)
    .where(and(eq(workOrders.id, id), eq(workOrders.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createWorkOrder(
  organizationId: string,
  createdByUserId: string | null,
  input: CreateWorkOrderInput,
  // `source` defaults to the DB column default ("staff") when omitted — only
  // system-driven generators (preventive maintenance) pass an override.
  overrides: { source?: string } = {},
) {
  const sequenceNumber = await getNextWorkOrderSequenceNumber(organizationId);

  const [row] = await db
    .insert(workOrders)
    .values({
      organizationId,
      propertyId: input.propertyId,
      propertyUnitId: input.propertyUnitId ?? null,
      propertyEquipmentId: input.propertyEquipmentId ?? null,
      propertyComponentId: input.propertyComponentId ?? null,
      assetId: input.assetId ?? null,
      vendorId: input.vendorId ?? null,
      categoryId: input.categoryId,
      subject: input.subject,
      description: input.description ?? null,
      priority: input.priority,
      requesterUserId: input.requesterUserId ?? createdByUserId ?? null,
      assignedUserId: input.assignedUserId ?? null,
      createdByUserId,
      number: formatWorkOrderNumber(sequenceNumber),
      scheduledStartAt: input.scheduledStartAt ? new Date(input.scheduledStartAt) : null,
      scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : null,
      ...(overrides.source ? { source: overrides.source } : {}),
    })
    .returning();
  return row;
}

export async function updateWorkOrder(
  organizationId: string,
  id: string,
  input: UpdateWorkOrderInput,
  extra: { resolvedAt?: Date; closedAt?: Date } = {},
) {
  const { scheduledStartAt, scheduledEndAt, ...rest } = input;
  const [row] = await db
    .update(workOrders)
    .set({
      ...stripUndefined(rest),
      ...(scheduledStartAt !== undefined
        ? { scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null }
        : {}),
      ...(scheduledEndAt !== undefined
        ? { scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : null }
        : {}),
      ...extra,
      updatedAt: new Date(),
    })
    .where(and(eq(workOrders.id, id), eq(workOrders.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
