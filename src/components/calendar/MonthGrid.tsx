"use client";

import { useMemo } from "react";

import { CALENDAR_SOURCE_COLOR_VARS } from "@/lib/calendar/colors";
import type { MonthGridDay } from "@/lib/calendar/grid";
import { formatTimestampInTimezone } from "@/lib/calendar/timezone";
import type { CalendarEvent } from "@/lib/calendar/types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PER_DAY = 4;

export function MonthGrid({
  days,
  events,
  today,
  timezone,
  onSelectEvent,
}: {
  days: MonthGridDay[];
  events: CalendarEvent[];
  today: string;
  timezone: string;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const eventsByDate = useMemo(() => {
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
    return map;
  }, [events]);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="muted"
            style={{ padding: "0.5rem", fontSize: "0.75rem", fontWeight: 600, textAlign: "center" }}
          >
            {label}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {days.map((day) => {
          const dayEvents = eventsByDate.get(day.date) ?? [];
          const visible = dayEvents.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = dayEvents.length - visible.length;
          const isToday = day.date === today;

          return (
            <div
              key={day.date}
              style={{
                minHeight: 108,
                padding: "0.35rem",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                background: day.inCurrentMonth ? "var(--surface)" : "var(--background)",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <div
                className={day.inCurrentMonth ? undefined : "muted"}
                style={{
                  fontSize: "0.8rem",
                  fontWeight: isToday ? 700 : 500,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: isToday ? "var(--brand)" : "transparent",
                  color: isToday ? "var(--brand-contrast)" : undefined,
                }}
              >
                {Number(day.date.slice(8, 10))}
              </div>
              {visible.map((event) => {
                const colors = CALENDAR_SOURCE_COLOR_VARS[event.sourceType];
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    title={event.title}
                    style={{
                      textAlign: "left",
                      fontSize: "0.72rem",
                      lineHeight: 1.2,
                      padding: "0.15rem 0.35rem",
                      borderRadius: 5,
                      border: `1px solid ${colors.border}`,
                      background: colors.bg,
                      color: colors.fg,
                      cursor: "pointer",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: event.overdue ? 700 : 500,
                    }}
                  >
                    {event.overdue ? "⚠ " : ""}
                    {event.allDay ? "" : `${formatTimestampInTimezone(event.startAt, timezone, { hour: "numeric", minute: "2-digit" })} `}
                    {event.title}
                  </button>
                );
              })}
              {overflow > 0 ? <div className="muted" style={{ fontSize: "0.7rem" }}>+{overflow} more</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
