import { PM_DUE_SOON_THRESHOLD_DAYS, type PmDueState, type PmIntervalUnit } from "./constants";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a "YYYY-MM-DD" string as a UTC calendar date (no time-of-day component). */
function parseDateOnly(value: string): Date {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error(`Expected a YYYY-MM-DD date string, got "${value}"`);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's UTC calendar date as "YYYY-MM-DD". No org-level timezone concept exists yet (see PROP-6 known limitations). */
export function todayDateString(): string {
  return formatDateOnly(new Date());
}

/**
 * Adds `months` to `date`, clamping the day-of-month to the last valid day of
 * the target month. Date.UTC(year, month + 1, 0) is the last day of `month`,
 * which is correct across leap years without special-casing February.
 */
function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, daysInTargetMonth)));
}

/**
 * Computes the next due date from the *previously scheduled* due date (never
 * from "today" or a completion date), so cadence never drifts — a plan due on
 * the 1st of every month keeps targeting the 1st even if generated/completed late.
 */
export function computeNextDueDate(
  fromDate: string,
  intervalUnit: PmIntervalUnit,
  intervalValue: number,
): string {
  if (!Number.isInteger(intervalValue) || intervalValue < 1) {
    throw new Error(`intervalValue must be a positive integer, got ${intervalValue}`);
  }

  const from = parseDateOnly(fromDate);

  if (intervalUnit === "week") {
    const next = new Date(from.getTime() + intervalValue * 7 * 24 * 60 * 60 * 1000);
    return formatDateOnly(next);
  }

  return formatDateOnly(addMonthsClamped(from, intervalValue));
}

/** Classifies a plan's next due date relative to today. Independent of isActive. */
export function classifyDueState(
  nextDueAt: string,
  today: string = todayDateString(),
  dueSoonThresholdDays: number = PM_DUE_SOON_THRESHOLD_DAYS,
): PmDueState {
  if (nextDueAt < today) {
    return "overdue";
  }

  const thresholdDate = formatDateOnly(
    new Date(parseDateOnly(today).getTime() + dueSoonThresholdDays * 24 * 60 * 60 * 1000),
  );

  return nextDueAt <= thresholdDate ? "due_soon" : "upcoming";
}
