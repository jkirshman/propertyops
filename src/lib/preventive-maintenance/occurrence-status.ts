import type { WorkOrderStatus } from "@/lib/work-orders/constants";

import type { PmOccurrenceStatus } from "./constants";

/**
 * Maps a work order's status onto the occurrence lifecycle. Resolved/closed
 * both mean the maintenance happened; cancelled is tracked distinctly so a
 * cancelled work order is never mistaken for completed maintenance. Any other
 * status (including a status moved back out of resolved/closed/cancelled)
 * maps back to "generated" — a reopen, not a new occurrence.
 */
export function mapWorkOrderStatusToOccurrenceStatus(status: WorkOrderStatus): PmOccurrenceStatus {
  if (status === "resolved" || status === "closed") {
    return "completed";
  }
  if (status === "cancelled") {
    return "cancelled";
  }
  return "generated";
}
