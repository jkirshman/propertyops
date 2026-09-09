import { WORK_ORDER_STALE_THRESHOLD_DAYS, type WorkOrderPriority } from "./constants";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole calendar days between `openedAt` and `today` — never negative. */
function daysOpen(openedAt: string | Date, today: string = todayDateString()): number {
  const openedDate = typeof openedAt === "string" ? openedAt.slice(0, 10) : openedAt.toISOString().slice(0, 10);
  const start = Date.UTC(...parseDateParts(openedDate));
  const end = Date.UTC(...parseDateParts(today));
  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}

function parseDateParts(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year, month - 1, day];
}

/** Open longer than the stale threshold — a Work Order has no due-date field, so age since opening stands in for "overdue." */
export function isWorkOrderOverdue(
  openedAt: string | Date,
  thresholdDays: number = WORK_ORDER_STALE_THRESHOLD_DAYS,
  today?: string,
): boolean {
  return daysOpen(openedAt, today) > thresholdDays;
}

export function isWorkOrderUrgentPriority(priority: string): priority is Extract<WorkOrderPriority, "high" | "urgent"> {
  return priority === "high" || priority === "urgent";
}
