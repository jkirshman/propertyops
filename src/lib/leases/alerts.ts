function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole calendar days from `today` to `date` — negative if `date` is in the past. */
export function daysUntil(date: string, today: string = todayDateString()): number {
  const start = Date.UTC(...parseDateParts(today));
  const end = Date.UTC(...parseDateParts(date));
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function parseDateParts(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year, month - 1, day];
}

export function isLeaseExpired(endDate: string | null, today: string = todayDateString()): boolean {
  return Boolean(endDate) && endDate! < today;
}

/** True once daysUntil(endDate) is at or below the threshold, but not yet expired. */
export function isLeaseExpiringWithin(
  endDate: string | null,
  thresholdDays: number,
  today: string = todayDateString(),
): boolean {
  if (!endDate || isLeaseExpired(endDate, today)) {
    return false;
  }
  return daysUntil(endDate, today) <= thresholdDays;
}

export function isDateApproaching(
  date: string | null,
  thresholdDays: number,
  today: string = todayDateString(),
): boolean {
  if (!date) {
    return false;
  }
  const remaining = daysUntil(date, today);
  return remaining >= 0 && remaining <= thresholdDays;
}
