// Pure month-grid math for the calendar Month view — no Date-object leakage
// across a real timezone boundary: everything here operates on UTC-anchored
// "calendar math" Dates purely to compute YYYY-MM-DD strings.

export interface MonthGridDay {
  date: string; // YYYY-MM-DD
  inCurrentMonth: boolean;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The 6-week (42-day) grid of a month view, starting on the Sunday on/before the 1st. */
export function getMonthGridDays(year: number, month: number): MonthGridDay[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstOfMonth.getUTCDay());

  const days: MonthGridDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(gridStart);
    day.setUTCDate(gridStart.getUTCDate() + i);
    days.push({ date: toDateString(day), inCurrentMonth: day.getUTCMonth() === month });
  }
  return days;
}

/** The full grid's inclusive date range — what the calendar API should be queried for. */
export function getMonthGridRange(year: number, month: number): { start: string; end: string } {
  const days = getMonthGridDays(year, month);
  return { start: days[0].date, end: days[days.length - 1].date };
}

export function addDaysToDateString(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return toDateString(next);
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}
