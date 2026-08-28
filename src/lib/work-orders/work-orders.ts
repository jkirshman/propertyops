import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { workOrderCounters, workOrders } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import { formatWorkOrderNumber } from "@/lib/work-orders/numbering";
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
  status?: string;
  priority?: string;
  categoryId?: string;
  assignedUserId?: string;
}

export async function listWorkOrders(organizationId: string, options: ListWorkOrdersOptions = {}) {
  const conditions = [eq(workOrders.organizationId, organizationId)];

  if (options.propertyId) {
    conditions.push(eq(workOrders.propertyId, options.propertyId));
  }
  if (options.propertyEquipmentId) {
    conditions.push(eq(workOrders.propertyEquipmentId, options.propertyEquipmentId));
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
  if (options.search) {
    const term = `%${options.search.trim()}%`;
    conditions.push(or(ilike(workOrders.subject, term), ilike(workOrders.number, term))!);
  }

  return db
    .select()
    .from(workOrders)
    .where(and(...conditions))
    .orderBy(desc(workOrders.updatedAt));
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
  createdByUserId: string,
  input: CreateWorkOrderInput,
) {
  const sequenceNumber = await getNextWorkOrderSequenceNumber(organizationId);

  const [row] = await db
    .insert(workOrders)
    .values({
      organizationId,
      propertyId: input.propertyId,
      propertyEquipmentId: input.propertyEquipmentId ?? null,
      categoryId: input.categoryId,
      subject: input.subject,
      description: input.description ?? null,
      priority: input.priority,
      requesterUserId: input.requesterUserId ?? createdByUserId,
      assignedUserId: input.assignedUserId ?? null,
      createdByUserId,
      number: formatWorkOrderNumber(sequenceNumber),
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
  const [row] = await db
    .update(workOrders)
    .set({ ...stripUndefined(input), ...extra, updatedAt: new Date() })
    .where(and(eq(workOrders.id, id), eq(workOrders.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
