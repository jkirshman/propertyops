import type { CalendarFilters, CalendarEvent } from "@/lib/calendar/types";

function eventDatePortion(event: CalendarEvent): string {
  return event.startAt.slice(0, 10);
}

/**
 * Pure, cross-cutting filter pass applied after every source has been
 * projected. `nowIso`/`today` are passed in explicitly (rather than read
 * from `Date.now()` here) so this stays cheaply testable.
 */
export function applyCalendarFilters(
  events: CalendarEvent[],
  filters: CalendarFilters,
  context: { nowIso: string; today: string },
): CalendarEvent[] {
  return events.filter((event) => {
    if (filters.propertyId && event.propertyId !== filters.propertyId) return false;
    if (filters.sourceType && event.sourceType !== filters.sourceType) return false;
    if (filters.status && event.status !== filters.status) return false;
    if (filters.vendorId && event.vendorId !== filters.vendorId) return false;
    if (filters.assignedUserId && event.assignedUserId !== filters.assignedUserId) return false;

    if (filters.rangeStart && eventDatePortion(event) < filters.rangeStart) return false;
    if (filters.rangeEnd && eventDatePortion(event) > filters.rangeEnd) return false;

    if (filters.overdueOnly && !event.overdue) return false;
    if (filters.upcomingOnly) {
      if (event.overdue) return false;
      const isFuture = event.allDay
        ? eventDatePortion(event) >= context.today
        : event.startAt >= context.nowIso;
      if (!isFuture) return false;
    }

    return true;
  });
}

export function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => a.startAt.localeCompare(b.startAt));
}
