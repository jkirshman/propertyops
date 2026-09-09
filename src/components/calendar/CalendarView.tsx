"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AgendaList } from "@/components/calendar/AgendaList";
import { ManualEventForm } from "@/components/calendar/ManualEventForm";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import {
  CALENDAR_SOURCE_TYPES,
  CALENDAR_SOURCE_TYPE_LABELS,
  type CalendarSourceType,
} from "@/lib/calendar/constants";
import { addDaysToDateString, addMonths, getMonthGridDays, getMonthGridRange } from "@/lib/calendar/grid";
import { todayInTimezone } from "@/lib/calendar/timezone";
import type { CalendarEvent } from "@/lib/calendar/types";

interface OptionRecord {
  id: string;
  name: string;
}
interface UserOption {
  id: string;
  displayName: string;
}

const AGENDA_WINDOW_DAYS = 30;

export function CalendarView({
  timezone,
  canCreateManualEvent,
}: {
  timezone: string;
  canCreateManualEvent: boolean;
}) {
  const today = todayInTimezone(timezone);
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [view, setView] = useState<"month" | "agenda">("month");
  const [agendaStart, setAgendaStart] = useState(today);

  const [propertyId, setPropertyId] = useState("");
  const [sourceType, setSourceType] = useState<CalendarSourceType | "">("");
  const [status, setStatus] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [vendors, setVendors] = useState<OptionRecord[]>([]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedManualEvent, setSelectedManualEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetch("/api/properties?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUsers(data.users ?? []));
    fetch("/api/vendors?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setVendors(data.vendors ?? []));
  }, []);

  const range = useMemo(() => {
    if (view === "month") return getMonthGridRange(year, month);
    return { start: agendaStart, end: addDaysToDateString(agendaStart, AGENDA_WINDOW_DAYS - 1) };
  }, [view, year, month, agendaStart]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    params.set("rangeStart", range.start);
    params.set("rangeEnd", range.end);
    if (propertyId) params.set("propertyId", propertyId);
    if (sourceType) params.set("sourceType", sourceType);
    if (status) params.set("status", status);
    if (vendorId) params.set("vendorId", vendorId);
    if (assignedUserId) params.set("assignedUserId", assignedUserId);
    if (upcomingOnly) params.set("upcomingOnly", "true");
    if (overdueOnly) params.set("overdueOnly", "true");

    return fetch(`/api/calendar?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setEvents(data.events ?? []);
      });
  }, [range, propertyId, sourceType, status, vendorId, assignedUserId, upcomingOnly, overdueOnly]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(handle);
  }, [load]);

  function goToday() {
    setYear(Number(today.slice(0, 4)));
    setMonth(Number(today.slice(5, 7)) - 1);
    setAgendaStart(today);
  }

  function goPrev() {
    if (view === "month") {
      const next = addMonths(year, month, -1);
      setYear(next.year);
      setMonth(next.month);
    } else {
      setAgendaStart((current) => addDaysToDateString(current, -AGENDA_WINDOW_DAYS));
    }
  }

  function goNext() {
    if (view === "month") {
      const next = addMonths(year, month, 1);
      setYear(next.year);
      setMonth(next.month);
    } else {
      setAgendaStart((current) => addDaysToDateString(current, AGENDA_WINDOW_DAYS));
    }
  }

  const days = useMemo(() => getMonthGridDays(year, month), [year, month]);
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function handleSelectEvent(event: CalendarEvent) {
    if (event.sourceType === "manual") {
      setSelectedManualEvent(event);
      return;
    }
    window.location.href = event.deepLinkUrl;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button type="button" className="button" onClick={goPrev}>
            ‹
          </button>
          <button type="button" className="button" onClick={goToday}>
            Today
          </button>
          <button type="button" className="button" onClick={goNext}>
            ›
          </button>
          <span style={{ fontWeight: 600, marginLeft: "0.5rem" }}>
            {view === "month" ? monthLabel : `Next ${AGENDA_WINDOW_DAYS} days from ${agendaStart}`}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setView("month")}
              className="button"
              style={{ border: "none", borderRadius: 0, background: view === "month" ? "var(--background)" : "var(--surface)" }}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView("agenda")}
              className="button"
              style={{ border: "none", borderRadius: 0, background: view === "agenda" ? "var(--background)" : "var(--surface)" }}
            >
              Agenda
            </button>
          </div>
          {canCreateManualEvent ? (
            <button type="button" className="button button-primary" onClick={() => setShowCreateForm(true)}>
              New Event
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <select className="input" style={{ maxWidth: 180 }} value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
          <option value="">All properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          style={{ maxWidth: 190 }}
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value as CalendarSourceType | "")}
        >
          <option value="">All event types</option>
          {CALENDAR_SOURCE_TYPES.map((value) => (
            <option key={value} value={value}>
              {CALENDAR_SOURCE_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <select className="input" style={{ maxWidth: 170 }} value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
          <option value="">Any vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          style={{ maxWidth: 170 }}
          value={assignedUserId}
          onChange={(event) => setAssignedUserId(event.target.value)}
        >
          <option value="">Any assignee</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName}
            </option>
          ))}
        </select>
        <input
          className="input"
          style={{ maxWidth: 140 }}
          placeholder="Status…"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem" }}>
          <input type="checkbox" checked={upcomingOnly} onChange={(event) => { setUpcomingOnly(event.target.checked); if (event.target.checked) setOverdueOnly(false); }} />
          Upcoming only
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem" }}>
          <input type="checkbox" checked={overdueOnly} onChange={(event) => { setOverdueOnly(event.target.checked); if (event.target.checked) setUpcomingOnly(false); }} />
          Overdue only
        </label>
      </div>

      {showCreateForm ? (
        <ManualEventForm
          properties={properties}
          timezone={timezone}
          onClose={() => setShowCreateForm(false)}
          onSaved={() => {
            setShowCreateForm(false);
            load();
          }}
        />
      ) : null}

      {selectedManualEvent ? (
        <ManualEventFormFromEvent
          event={selectedManualEvent}
          properties={properties}
          timezone={timezone}
          canEdit={canCreateManualEvent}
          onClose={() => setSelectedManualEvent(null)}
          onSaved={() => {
            setSelectedManualEvent(null);
            load();
          }}
        />
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : view === "month" ? (
        <MonthGrid days={days} events={events} today={today} timezone={timezone} onSelectEvent={handleSelectEvent} />
      ) : (
        <AgendaList events={events} timezone={timezone} onSelectEvent={handleSelectEvent} />
      )}
    </div>
  );
}

/** Fetches the manual event's full record (description, status) before rendering the edit form. */
function ManualEventFormFromEvent({
  event,
  properties,
  timezone,
  canEdit,
  onClose,
  onSaved,
}: {
  event: CalendarEvent;
  properties: OptionRecord[];
  timezone: string;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [initial, setInitial] = useState<null | {
    id: string;
    title: string;
    propertyId: string | null;
    description: string | null;
    startAt: string;
    endAt: string | null;
    allDay: boolean;
    status: string;
  }>(null);

  useEffect(() => {
    fetch(`/api/operational-events/${event.sourceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.event) return;
        setInitial({
          id: data.event.id,
          title: data.event.title,
          propertyId: data.event.propertyId,
          description: data.event.description,
          startAt: data.event.startAt,
          endAt: data.event.endAt,
          allDay: data.event.allDay,
          status: data.event.status,
        });
      });
  }, [event.sourceId]);

  if (!initial) {
    return (
      <div className="card">
        <p className="muted">Loading event…</p>
      </div>
    );
  }

  return (
    <ManualEventForm
      properties={properties}
      timezone={timezone}
      canEdit={canEdit}
      initial={initial}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
