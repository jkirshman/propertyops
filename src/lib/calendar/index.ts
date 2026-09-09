import { applyCalendarFilters, sortCalendarEvents } from "@/lib/calendar/filters";
import { fetchComplianceEvents } from "@/lib/calendar/projections/compliance";
import { fetchInspectionEvents } from "@/lib/calendar/projections/inspections";
import { fetchLeaseEvents } from "@/lib/calendar/projections/leases";
import { fetchPreventiveMaintenanceEvents } from "@/lib/calendar/projections/preventive-maintenance";
import { fetchWorkOrderEvents } from "@/lib/calendar/projections/work-orders";
import { fetchOperationalEvents } from "@/lib/calendar/operational-events";
import { todayInTimezone } from "@/lib/calendar/timezone";
import type { CalendarFilters, CalendarEvent } from "@/lib/calendar/types";
import type { CalendarSourceType } from "@/lib/calendar/constants";

export type { CalendarEvent, CalendarFilters } from "@/lib/calendar/types";
export * from "@/lib/calendar/constants";

/**
 * The single read path for the Operations Calendar. Merges every module's
 * live projection — never a stored copy — applies the cross-cutting
 * filters, and returns events sorted for both the Month grid and the
 * Agenda/List view.
 */
export async function listCalendarEvents(
  organizationId: string,
  organizationTimezone: string,
  filters: CalendarFilters = {},
): Promise<CalendarEvent[]> {
  const now = new Date();
  const today = todayInTimezone(organizationTimezone, now);

  const wants = (type: CalendarSourceType) => !filters.sourceType || filters.sourceType === type;

  const [workOrderEvents, pmEvents, inspectionEvents, complianceEvents, leaseEvents, manualEvents] =
    await Promise.all([
      wants("work_order") ? fetchWorkOrderEvents(organizationId, now) : Promise.resolve([]),
      wants("preventive_maintenance")
        ? fetchPreventiveMaintenanceEvents(organizationId, now, today)
        : Promise.resolve([]),
      wants("inspection")
        ? fetchInspectionEvents(organizationId, now, today, filters.includeCompletedInspections ?? false)
        : Promise.resolve([]),
      wants("compliance") ? fetchComplianceEvents(organizationId, today) : Promise.resolve([]),
      wants("lease") ? fetchLeaseEvents(organizationId, today) : Promise.resolve([]),
      wants("manual") ? fetchOperationalEvents(organizationId, now) : Promise.resolve([]),
    ]);

  const all = [
    ...workOrderEvents,
    ...pmEvents,
    ...inspectionEvents,
    ...complianceEvents,
    ...leaseEvents,
    ...manualEvents,
  ];

  const filtered = applyCalendarFilters(all, filters, { nowIso: now.toISOString(), today });
  return sortCalendarEvents(filtered);
}
