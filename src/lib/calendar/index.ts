import { listAccessiblePropertyIds, type PropertyScope } from "@/lib/auth/property-access";
import { applyCalendarFilters, sortCalendarEvents } from "@/lib/calendar/filters";
import { fetchComplianceEvents } from "@/lib/calendar/projections/compliance";
import { fetchInspectionEvents } from "@/lib/calendar/projections/inspections";
import { fetchLeaseEvents } from "@/lib/calendar/projections/leases";
import { fetchPreventiveMaintenanceEvents } from "@/lib/calendar/projections/preventive-maintenance";
import { fetchWorkOrderEvents } from "@/lib/calendar/projections/work-orders";
import { fetchOperationalEvents } from "@/lib/calendar/operational-events";
import { todayInTimezone } from "@/lib/calendar/timezone";
import { resolveHiddenEquipmentIds } from "@/lib/equipment/equipment-access";
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
  // ACCESS-1: the resolved requester's Property/Unit scope. Every source is
  // filtered through it (Leases, Work Orders, Inspections, and PM are
  // Unit-aware — UNIT-OPS-1 / UNIT-EQUIP-1; manual events keep
  // org-wide/null-property entries visible to everyone).
  scope: PropertyScope = { kind: "all" },
): Promise<CalendarEvent[]> {
  const now = new Date();
  const today = todayInTimezone(organizationTimezone, now);
  const propertyIds = listAccessiblePropertyIds(scope);

  const wants = (type: CalendarSourceType) => !filters.sourceType || filters.sourceType === type;

  const [workOrderEvents, pmEvents, inspectionEvents, complianceEvents, leaseEvents, manualEvents] =
    await Promise.all([
      wants("work_order") ? fetchWorkOrderEvents(organizationId, now, scope) : Promise.resolve([]),
      wants("preventive_maintenance")
        ? resolveHiddenEquipmentIds(organizationId, scope).then((hiddenEquipmentIds) =>
            fetchPreventiveMaintenanceEvents(organizationId, now, today, propertyIds, hiddenEquipmentIds),
          )
        : Promise.resolve([]),
      wants("inspection")
        ? fetchInspectionEvents(
            organizationId,
            now,
            today,
            filters.includeCompletedInspections ?? false,
            scope,
          )
        : Promise.resolve([]),
      wants("compliance") ? fetchComplianceEvents(organizationId, today, propertyIds) : Promise.resolve([]),
      wants("lease") ? fetchLeaseEvents(organizationId, today, scope) : Promise.resolve([]),
      wants("manual") ? fetchOperationalEvents(organizationId, now, propertyIds) : Promise.resolve([]),
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
