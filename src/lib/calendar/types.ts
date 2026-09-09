import type { CalendarCategory, CalendarSourceType } from "./constants";

/**
 * A single projected Operations Calendar entry. Never a system of record —
 * always derived, at read time, from a source module's own tables (or, for
 * manual events, the operational_events table). See lib/calendar/index.ts.
 *
 * `startAt`/`endAt` hold either a full ISO 8601 timestamp (timed event) or a
 * plain `YYYY-MM-DD` date (date-only/all-day event) — callers branch on
 * `allDay`, never on string length or a timezone conversion, so a date-only
 * milestone (lease/compliance expiration, unscheduled PM due date) is never
 * coerced through a midnight-UTC timestamp.
 */
export interface CalendarEvent {
  id: string;
  organizationId: string;
  sourceType: CalendarSourceType;
  sourceId: string;
  category: CalendarCategory;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  propertyId: string | null;
  vendorId: string | null;
  assignedUserId: string | null;
  status: string;
  statusLabel: string;
  overdue: boolean;
  deepLinkUrl: string;
  metadata: Record<string, unknown>;
}

export interface CalendarFilters {
  propertyId?: string;
  sourceType?: CalendarSourceType;
  status?: string;
  vendorId?: string;
  assignedUserId?: string;
  upcomingOnly?: boolean;
  overdueOnly?: boolean;
  /** Inclusive `YYYY-MM-DD` range bounds. Omit either side for an open range. */
  rangeStart?: string;
  rangeEnd?: string;
  /** Completed/cancelled inspections are excluded by default (PROP-10 scope). */
  includeCompletedInspections?: boolean;
}
