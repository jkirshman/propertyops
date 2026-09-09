"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { zonedTimeToUtc, utcToZonedInputValue } from "@/lib/calendar/timezone";
import { VALIDATION_BANNER_MESSAGE, describeApiError, invalidFieldProps, mapFieldErrors } from "@/lib/forms/field-errors";
import { createOperationalEventSchema, updateOperationalEventSchema } from "@/lib/validation/operational-events";

interface OptionRecord {
  id: string;
  name: string;
}

export interface ManualEventInitial {
  id: string;
  title: string;
  propertyId: string | null;
  description: string | null;
  startAt: string; // ISO
  endAt: string | null;
  allDay: boolean;
  status: string;
}

function toInputValue(iso: string, isAllDay: boolean, timezone: string): string {
  return isAllDay ? iso.slice(0, 10) : utcToZonedInputValue(iso, timezone);
}

export function ManualEventForm({
  properties,
  timezone,
  canEdit = true,
  initial,
  initialPropertyId,
  onClose,
  onSaved,
}: {
  properties: OptionRecord[];
  timezone: string;
  canEdit?: boolean;
  initial?: ManualEventInitial;
  initialPropertyId?: string;
  onClose?: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [propertyId, setPropertyId] = useState(initial?.propertyId ?? initialPropertyId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [startValue, setStartValue] = useState(() =>
    initial ? toInputValue(initial.startAt, initial.allDay, timezone) : "",
  );
  const [endValue, setEndValue] = useState(() =>
    initial?.endAt ? toInputValue(initial.endAt, initial.allDay, timezone) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function toIsoOrUndefined(value: string, isAllDay: boolean): string | undefined {
    if (!value) return undefined;
    return isAllDay ? `${value}T00:00:00.000Z` : zonedTimeToUtc(value, timezone).toISOString();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const startAt = toIsoOrUndefined(startValue, allDay);
    const endAt = toIsoOrUndefined(endValue, allDay);

    const payload = {
      title,
      propertyId: propertyId || undefined,
      description: description || undefined,
      startAt,
      endAt,
      allDay,
    };

    const schema = isEdit ? updateOperationalEventSchema : createOperationalEventSchema;
    const localResult = schema.safeParse(payload);
    if (!localResult.success) {
      setFieldErrors(mapFieldErrors(localResult.error.flatten().fieldErrors));
      setError(VALIDATION_BANNER_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        isEdit ? `/api/operational-events/${initial!.id}` : "/api/operational-events",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const serverFieldErrors = data?.details?.fieldErrors as Record<string, string[] | undefined> | undefined;
        if (serverFieldErrors && Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(mapFieldErrors(serverFieldErrors));
          setError(VALIDATION_BANNER_MESSAGE);
        } else {
          setError(describeApiError(data?.error));
        }
        return;
      }
      onSaved();
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelEvent() {
    if (!initial) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/operational-events/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(describeApiError(data?.error));
        return;
      }
      onSaved();
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
        <div>
          <label className="label" htmlFor="manual-event-title">
            Title
          </label>
          <input
            id="manual-event-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={!canEdit}
            {...invalidFieldProps(Boolean(fieldErrors.title))}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="manual-event-property">
            Property (optional)
          </label>
          <select
            id="manual-event-property"
            className="input"
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            disabled={!canEdit}
          >
            <option value="">No specific property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={allDay}
              disabled={!canEdit}
              onChange={(event) => setAllDay(event.target.checked)}
            />
            All-day
          </label>
        </div>
        <div>
          <label className="label" htmlFor="manual-event-start">
            Start
          </label>
          <input
            id="manual-event-start"
            type={allDay ? "date" : "datetime-local"}
            className="input"
            value={startValue}
            onChange={(event) => setStartValue(event.target.value)}
            disabled={!canEdit}
            {...invalidFieldProps(Boolean(fieldErrors.startAt))}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="manual-event-end">
            End (optional)
          </label>
          <input
            id="manual-event-end"
            type={allDay ? "date" : "datetime-local"}
            className="input"
            value={endValue}
            onChange={(event) => setEndValue(event.target.value)}
            disabled={!canEdit}
            {...invalidFieldProps(Boolean(fieldErrors.endAt))}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="manual-event-description">
          Description / notes (optional)
        </label>
        <textarea
          id="manual-event-description"
          className="input"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!canEdit}
        />
      </div>

      {canEdit ? (
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create event"}
          </button>
          {onClose ? (
            <button type="button" className="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          ) : null}
          {isEdit && initial!.status === "active" ? (
            <button
              type="button"
              className="button"
              onClick={handleCancelEvent}
              disabled={submitting}
              style={{ marginLeft: "auto", color: "var(--danger)" }}
            >
              Cancel event
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
