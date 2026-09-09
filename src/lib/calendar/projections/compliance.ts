import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db/client";
import { complianceRecords } from "@/db/schema";
import type { CalendarEvent } from "@/lib/calendar/types";

export interface ComplianceCalendarRow {
  id: string;
  organizationId: string;
  propertyId: string;
  name: string;
  expirationDate: string | null;
}

/**
 * Projects the true expiration date only — never the 90/60/30-day warning
 * thresholds, which are notification concerns (see lib/compliance/notification-events.ts),
 * not separate calendar entries. Returns null for a record with no expiration date.
 */
export function projectComplianceEvent(row: ComplianceCalendarRow, today: string): CalendarEvent | null {
  if (!row.expirationDate) {
    return null;
  }

  return {
    id: `compliance:${row.id}`,
    organizationId: row.organizationId,
    sourceType: "compliance",
    sourceId: row.id,
    category: "compliance_expiration",
    title: `Expires: ${row.name}`,
    startAt: row.expirationDate,
    endAt: null,
    allDay: true,
    propertyId: row.propertyId,
    vendorId: null,
    assignedUserId: null,
    status: row.expirationDate < today ? "expired" : "current",
    statusLabel: row.expirationDate < today ? "Expired" : "Current",
    overdue: row.expirationDate < today,
    deepLinkUrl: `/properties/${row.propertyId}?tab=compliance`,
    metadata: {},
  };
}

export async function fetchComplianceEvents(organizationId: string, today: string): Promise<CalendarEvent[]> {
  const rows = await db
    .select({
      id: complianceRecords.id,
      organizationId: complianceRecords.organizationId,
      propertyId: complianceRecords.propertyId,
      name: complianceRecords.name,
      expirationDate: complianceRecords.expirationDate,
    })
    .from(complianceRecords)
    .where(
      and(
        eq(complianceRecords.organizationId, organizationId),
        eq(complianceRecords.isActive, true),
        isNotNull(complianceRecords.expirationDate),
      ),
    );

  return rows
    .map((row) => projectComplianceEvent(row, today))
    .filter((event): event is CalendarEvent => event !== null);
}
