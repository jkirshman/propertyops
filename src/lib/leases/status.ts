import type { LeaseEffectiveStatus, LeaseStatus } from "./constants";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Combines the stored lifecycle status with dates to produce the display
 * status, at read time — never stored, so it can never go stale. Manual
 * states (draft/month_to_month/terminated) always win; 'active' is refined
 * into upcoming/active/expired purely from start/end dates vs today.
 */
export function getEffectiveLeaseStatus(
  status: LeaseStatus,
  startDate: string,
  endDate: string | null,
  today: string = todayDateString(),
): LeaseEffectiveStatus {
  if (status === "terminated" || status === "draft" || status === "month_to_month") {
    return status;
  }

  // status === "active"
  if (startDate > today) {
    return "upcoming";
  }
  if (endDate && endDate < today) {
    return "expired";
  }
  return "active";
}
