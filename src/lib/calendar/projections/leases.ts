import type { PropertyScope } from "@/lib/auth/property-access";
import type { CalendarCategory } from "@/lib/calendar/constants";
import type { CalendarEvent } from "@/lib/calendar/types";
import { listLeases } from "@/lib/leases/leases";

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

/**
 * ACCESS-1: Leases are the one Unit-scoped entity in the app (see
 * lib/leases/leases.ts's buildLeaseScopeCondition) — reuses `listLeases`
 * rather than a raw query here so the calendar inherits the same Unit-aware
 * scoping as every other Lease read path, instead of a second, potentially
 * divergent implementation of the same rule.
 */
export async function fetchLeaseEvents(
  organizationId: string,
  today: string,
  scope?: PropertyScope,
): Promise<CalendarEvent[]> {
  const rows = await listLeases(organizationId, { scope });
  return rows.flatMap((row) => projectLeaseMilestones(row, today));
}
