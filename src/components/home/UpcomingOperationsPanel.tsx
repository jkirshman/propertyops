import Link from "next/link";

import { listCalendarEvents } from "@/lib/calendar";
import { CALENDAR_SOURCE_TYPE_LABELS } from "@/lib/calendar/constants";
import { formatDateOnly, formatTimestampInTimezone, todayInTimezone } from "@/lib/calendar/timezone";
import type { CalendarEvent } from "@/lib/calendar/types";

const MAX_ITEMS_PER_COLUMN = 5;

function EventRow({ event, timezone }: { event: CalendarEvent; timezone: string }) {
  return (
    <Link
      href={event.deepLinkUrl}
      style={{ display: "flex", flexDirection: "column", padding: "0.4rem 0", borderBottom: "1px solid var(--border)" }}
    >
      <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
        {event.overdue ? "⚠ " : ""}
        {event.title}
      </span>
      <span className="muted" style={{ fontSize: "0.72rem" }}>
        {CALENDAR_SOURCE_TYPE_LABELS[event.sourceType]} ·{" "}
        {event.allDay ? formatDateOnly(event.startAt) : formatTimestampInTimezone(event.startAt, timezone)}
      </span>
    </Link>
  );
}

function Column({ title, events, timezone, emptyText }: { title: string; events: CalendarEvent[]; timezone: string; emptyText: string }) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>{title}</div>
      {events.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          {emptyText}
        </p>
      ) : (
        events.slice(0, MAX_ITEMS_PER_COLUMN).map((event) => <EventRow key={event.id} event={event} timezone={timezone} />)
      )}
    </div>
  );
}

export async function UpcomingOperationsPanel({
  organizationId,
  timezone,
}: {
  organizationId: string;
  timezone: string;
}) {
  const today = todayInTimezone(timezone);
  const in7Days = new Date(`${today}T00:00:00.000Z`);
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);
  const rangeEnd = in7Days.toISOString().slice(0, 10);

  const [upcoming, overdue] = await Promise.all([
    listCalendarEvents(organizationId, timezone, { rangeStart: today, rangeEnd }),
    listCalendarEvents(organizationId, timezone, { overdueOnly: true }),
  ]);

  const todayEvents = upcoming.filter((event) => event.startAt.slice(0, 10) === today);
  const next7Days = upcoming.filter((event) => event.startAt.slice(0, 10) !== today);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Operations</h2>
        <Link href="/calendar" className="muted" style={{ fontSize: "0.85rem" }}>
          View calendar →
        </Link>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <Column title="Today" events={todayEvents} timezone={timezone} emptyText="Nothing scheduled today." />
        <Column title="Next 7 Days" events={next7Days} timezone={timezone} emptyText="Nothing else coming up." />
        <Column title="Overdue" events={overdue} timezone={timezone} emptyText="Nothing overdue." />
      </div>
    </div>
  );
}
