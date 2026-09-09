"use client";

import { useMemo } from "react";

import { CALENDAR_CATEGORY_LABELS, CALENDAR_SOURCE_TYPE_LABELS } from "@/lib/calendar/constants";
import { CALENDAR_SOURCE_COLOR_VARS } from "@/lib/calendar/colors";
import { formatDateOnly, formatTimestampInTimezone } from "@/lib/calendar/timezone";
import type { CalendarEvent } from "@/lib/calendar/types";

export function AgendaList({
  events,
  timezone,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  timezone: string;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const date = event.startAt.slice(0, 10);
      const bucket = map.get(date);
      if (bucket) {
        bucket.push(event);
      } else {
        map.set(date, [event]);
      }
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (groups.length === 0) {
    return (
      <div className="card">
        <p className="muted">No events in this range.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {groups.map(([date, dayEvents]) => (
        <div key={date} className="card">
          <div style={{ fontWeight: 600, marginBottom: "0.6rem" }}>{formatDateOnly(date)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {dayEvents.map((event) => {
              const colors = CALENDAR_SOURCE_COLOR_VARS[event.sourceType];
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    textAlign: "left",
                    padding: "0.5rem 0.6rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.bg,
                    color: colors.fg,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", minWidth: 72 }}>
                    {event.allDay ? "All day" : formatTimestampInTimezone(event.startAt, timezone, { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <span style={{ flex: 1, fontWeight: 500 }}>
                    {event.overdue ? "⚠ " : ""}
                    {event.title}
                  </span>
                  <span className="muted" style={{ fontSize: "0.72rem" }}>
                    {CALENDAR_SOURCE_TYPE_LABELS[event.sourceType]} · {CALENDAR_CATEGORY_LABELS[event.category]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
