import { and, eq, inArray, or, isNotNull } from "drizzle-orm";

import { db } from "@/db/client";
import { inspections } from "@/db/schema";
import { listAccessiblePropertyIds, type PropertyScope } from "@/lib/auth/property-access";
import type { CalendarEvent } from "@/lib/calendar/types";
import { filterAccessibleInspections } from "@/lib/inspections/inspection-access";

const ACTIVE_STATUSES = new Set(["draft", "in_progress"]);

export interface InspectionCalendarRow {
  id: string;
  organizationId: string;
  propertyId: string;
  propertyUnitId: string | null;
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
  // ACCESS-1 / UNIT-OPS-1: Property-scoped in SQL, then Unit-scoped via
  // filterAccessibleInspections before projecting.
  scope: PropertyScope,
): Promise<CalendarEvent[]> {
  const propertyIds = listAccessiblePropertyIds(scope);
  if (propertyIds !== null && propertyIds.length === 0) {
    return [];
  }

  const conditions = [
    eq(inspections.organizationId, organizationId),
    or(isNotNull(inspections.scheduledDate), isNotNull(inspections.scheduledStartAt))!,
  ];
  if (propertyIds !== null) {
    conditions.push(inArray(inspections.propertyId, propertyIds));
  }

  const rows = await db
    .select({
      id: inspections.id,
      organizationId: inspections.organizationId,
      propertyId: inspections.propertyId,
      propertyUnitId: inspections.propertyUnitId,
      templateName: inspections.templateName,
      status: inspections.status,
      inspectorUserId: inspections.inspectorUserId,
      scheduledDate: inspections.scheduledDate,
      scheduledStartAt: inspections.scheduledStartAt,
      scheduledEndAt: inspections.scheduledEndAt,
    })
    .from(inspections)
    .where(and(...conditions));

  return filterAccessibleInspections(scope, rows)
    .filter((row) => includeCompleted || ACTIVE_STATUSES.has(row.status))
    .map((row) => projectInspectionEvent(row, now, today))
    .filter((event): event is CalendarEvent => event !== null);
}
