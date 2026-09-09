import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { leases } from "@/db/schema";
import type { CalendarCategory } from "@/lib/calendar/constants";
import type { CalendarEvent } from "@/lib/calendar/types";

export interface LeaseCalendarRow {
  id: string;
  organizationId: string;
  propertyId: string;
  label: string;
  startDate: string;
  endDate: string | null;
  noticeDate: string | null;
  renewalOptionDate: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
}

const MILESTONE_FIELDS: {
  field: keyof LeaseCalendarRow;
  category: CalendarCategory;
  labelPrefix: string;
}[] = [
  { field: "startDate", category: "lease_start", labelPrefix: "Lease Start" },
  { field: "endDate", category: "lease_end", labelPrefix: "Lease End" },
  { field: "noticeDate", category: "lease_notice", labelPrefix: "Notice Date" },
  { field: "renewalOptionDate", category: "lease_renewal_option", labelPrefix: "Renewal Option" },
  { field: "moveInDate", category: "lease_move_in", labelPrefix: "Move-In" },
  { field: "moveOutDate", category: "lease_move_out", labelPrefix: "Move-Out" },
];

/**
 * Projects only the operationally meaningful lease dates (start/end/notice/
 * renewal-option/move-in/move-out) — deliberately not every stored lease
 * field (rent, deposit, etc.), to avoid calendar clutter.
 */
export function projectLeaseMilestones(row: LeaseCalendarRow, today: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const { field, category, labelPrefix } of MILESTONE_FIELDS) {
    const date = row[field] as string | null;
    if (!date) {
      continue;
    }

    events.push({
      id: `lease:${row.id}:${category}`,
      organizationId: row.organizationId,
      sourceType: "lease",
      sourceId: row.id,
      category,
      title: `${labelPrefix}: ${row.label}`,
      startAt: date,
      endAt: null,
      allDay: true,
      propertyId: row.propertyId,
      vendorId: null,
      assignedUserId: null,
      status: date < today ? "past" : "upcoming",
      statusLabel: date < today ? "Past" : "Upcoming",
      overdue: date < today,
      deepLinkUrl: `/leases/${row.id}`,
      metadata: {},
    });
  }

  return events;
}

export async function fetchLeaseEvents(organizationId: string, today: string): Promise<CalendarEvent[]> {
  const rows = await db
    .select({
      id: leases.id,
      organizationId: leases.organizationId,
      propertyId: leases.propertyId,
      label: leases.label,
      startDate: leases.startDate,
      endDate: leases.endDate,
      noticeDate: leases.noticeDate,
      renewalOptionDate: leases.renewalOptionDate,
      moveInDate: leases.moveInDate,
      moveOutDate: leases.moveOutDate,
    })
    .from(leases)
    .where(eq(leases.organizationId, organizationId));

  return rows.flatMap((row) => projectLeaseMilestones(row, today));
}
