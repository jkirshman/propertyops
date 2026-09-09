import { and, eq, or, isNotNull } from "drizzle-orm";

import { db } from "@/db/client";
import { inspections } from "@/db/schema";
import type { CalendarEvent } from "@/lib/calendar/types";

const ACTIVE_STATUSES = new Set(["draft", "in_progress"]);

export interface InspectionCalendarRow {
  id: string;
  organizationId: string;
  propertyId: string;
  templateName: string;
  status: string;
  inspectorUserId: string | null;
  scheduledDate: string | null;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
}

/** Returns null when there is no date to plot (neither a time nor a date-only scheduled date). */
export function projectInspectionEvent(
  row: InspectionCalendarRow,
  now: Date,
  today: string,
): CalendarEvent | null {
  const timed = row.scheduledStartAt !== null;
  if (!timed && !row.scheduledDate) {
    return null;
  }

  const isActive = ACTIVE_STATUSES.has(row.status);
  const overdue =
    isActive &&
    (timed ? row.scheduledStartAt! < now : row.scheduledDate! < today);

  return {
    id: `inspection:${row.id}`,
    organizationId: row.organizationId,
    sourceType: "inspection",
    sourceId: row.id,
    category: timed ? "inspection_scheduled" : "inspection_due",
    title: row.templateName,
    startAt: timed ? row.scheduledStartAt!.toISOString() : row.scheduledDate!,
    endAt: row.scheduledEndAt ? row.scheduledEndAt.toISOString() : null,
    allDay: !timed,
    propertyId: row.propertyId,
    vendorId: null,
    assignedUserId: row.inspectorUserId,
    status: row.status,
    statusLabel: row.status,
    overdue,
    deepLinkUrl: `/inspections/${row.id}`,
    metadata: {},
  };
}

export async function fetchInspectionEvents(
  organizationId: string,
  now: Date,
  today: string,
  includeCompleted: boolean,
): Promise<CalendarEvent[]> {
  const rows = await db
    .select({
      id: inspections.id,
      organizationId: inspections.organizationId,
      propertyId: inspections.propertyId,
      templateName: inspections.templateName,
      status: inspections.status,
      inspectorUserId: inspections.inspectorUserId,
      scheduledDate: inspections.scheduledDate,
      scheduledStartAt: inspections.scheduledStartAt,
      scheduledEndAt: inspections.scheduledEndAt,
    })
    .from(inspections)
    .where(
      and(
        eq(inspections.organizationId, organizationId),
        or(isNotNull(inspections.scheduledDate), isNotNull(inspections.scheduledStartAt)),
      ),
    );

  return rows
    .filter((row) => includeCompleted || ACTIVE_STATUSES.has(row.status))
    .map((row) => projectInspectionEvent(row, now, today))
    .filter((event): event is CalendarEvent => event !== null);
}
