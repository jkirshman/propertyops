import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { operationalEvents } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateOperationalEventInput,
  UpdateOperationalEventInput,
} from "@/lib/validation/operational-events";
import type { CalendarEvent } from "@/lib/calendar/types";

export type OperationalEventRow = typeof operationalEvents.$inferSelect;

export interface ListOperationalEventsOptions {
  propertyId?: string;
  status?: string;
}

export async function listOperationalEvents(
  organizationId: string,
  options: ListOperationalEventsOptions = {},
): Promise<OperationalEventRow[]> {
  const conditions = [eq(operationalEvents.organizationId, organizationId)];
  if (options.propertyId) {
    conditions.push(eq(operationalEvents.propertyId, options.propertyId));
  }
  if (options.status) {
    conditions.push(eq(operationalEvents.status, options.status));
  }

  return db
    .select()
    .from(operationalEvents)
    .where(and(...conditions));
}

export async function getOperationalEvent(
  organizationId: string,
  id: string,
): Promise<OperationalEventRow | null> {
  const [row] = await db
    .select()
    .from(operationalEvents)
    .where(and(eq(operationalEvents.id, id), eq(operationalEvents.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createOperationalEvent(
  organizationId: string,
  createdByUserId: string | null,
  input: CreateOperationalEventInput,
): Promise<OperationalEventRow> {
  const [row] = await db
    .insert(operationalEvents)
    .values({
      organizationId,
      propertyId: input.propertyId ?? null,
      title: input.title,
      description: input.description ?? null,
      startAt: new Date(input.startAt),
      endAt: input.endAt ? new Date(input.endAt) : null,
      allDay: input.allDay,
      createdByUserId,
    })
    .returning();
  return row;
}

export async function updateOperationalEvent(
  organizationId: string,
  id: string,
  input: UpdateOperationalEventInput,
): Promise<OperationalEventRow | null> {
  const { startAt, endAt, ...rest } = input;
  const [row] = await db
    .update(operationalEvents)
    .set({
      ...stripUndefined(rest),
      ...(startAt !== undefined ? { startAt: new Date(startAt) } : {}),
      ...(endAt !== undefined ? { endAt: endAt ? new Date(endAt) : null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(operationalEvents.id, id), eq(operationalEvents.organizationId, organizationId)))
    .returning();
  return row ?? null;
}

/**
 * Projects a manual event. All-day events were written with their calendar
 * date anchored at UTC midnight (see the create/update helpers above and the
 * ManualEventForm client), so the UTC date portion is read back directly
 * here rather than reinterpreted through the organization timezone — a
 * deterministic round-trip that never shifts the displayed day.
 */
export function projectOperationalEvent(row: OperationalEventRow, now: Date): CalendarEvent {
  const overdue = row.status === "active" && (row.endAt ?? row.startAt) < now;

  return {
    id: `manual:${row.id}`,
    organizationId: row.organizationId,
    sourceType: "manual",
    sourceId: row.id,
    category: "manual_event",
    title: row.title,
    startAt: row.allDay ? row.startAt.toISOString().slice(0, 10) : row.startAt.toISOString(),
    endAt: row.endAt ? (row.allDay ? row.endAt.toISOString().slice(0, 10) : row.endAt.toISOString()) : null,
    allDay: row.allDay,
    propertyId: row.propertyId,
    vendorId: null,
    assignedUserId: null,
    status: row.status,
    statusLabel: row.status === "cancelled" ? "Cancelled" : "Active",
    overdue,
    deepLinkUrl: `/calendar/events/${row.id}`,
    metadata: { description: row.description },
  };
}

export async function fetchOperationalEvents(organizationId: string, now: Date): Promise<CalendarEvent[]> {
  const rows = await listOperationalEvents(organizationId);
  return rows.map((row) => projectOperationalEvent(row, now));
}
