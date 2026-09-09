// Org-level timezone display helpers (PROP-10). PropertyOps has no per-user
// timezone preference — every timed value is displayed/edited in the
// organization's single configured timezone (organizations.timezone).
//
// Date-only values (YYYY-MM-DD) never pass through here: they are rendered
// as plain calendar dates, with no timezone conversion at all.

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a plain `YYYY-MM-DD` calendar date; false for a full ISO timestamp. */
export function isDateOnlyValue(value: string): boolean {
  return DATE_ONLY_PATTERN.test(value);
}

/** Today's date, as `YYYY-MM-DD`, in the given IANA timezone — not the server's local time. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA formats as YYYY-MM-DD, matching our stored date-only convention.
  return formatter.format(now);
}

/** Formats an ISO timestamp for display in the given IANA timezone. */
export function formatTimestampInTimezone(
  isoTimestamp: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: timezone }).format(
    new Date(isoTimestamp),
  );
}

/**
 * Minutes to ADD to a UTC instant to get the wall-clock time in `timeZone`
 * (e.g. -240 for America/Detroit in EDT). Computed via Intl rather than a
 * timezone-database dependency: it reads what wall-clock time `instant`
 * renders as in `timeZone`, reinterprets those same digits as UTC, and
 * diffs the two — the standard Intl-only technique for this conversion.
 */
export function getTimezoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));

  return (asIfUtc - instant.getTime()) / 60_000;
}

/**
 * Converts a wall-clock `YYYY-MM-DDTHH:mm` value (e.g. from a
 * `<input type="datetime-local">`) — understood as local time *in
 * `timeZone`*, not the browser's timezone — into the UTC instant it
 * represents.
 */
export function zonedTimeToUtc(localDateTime: string, timeZone: string): Date {
  const naiveUtc = new Date(`${localDateTime}:00.000Z`);
  const offsetMinutes = getTimezoneOffsetMinutes(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60_000);
}

/** Inverse of zonedTimeToUtc: formats a UTC instant as a `YYYY-MM-DDTHH:mm` value for a datetime-local input, in `timeZone`. */
export function utcToZonedInputValue(isoTimestamp: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(isoTimestamp));

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Formats a date-only (`YYYY-MM-DD`) value without any timezone conversion. */
export function formatDateOnly(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  // Construct as a UTC noon instant purely to drive Intl's calendar-date
  // formatting — never used to derive "today" or any other comparison.
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(instant);
}
