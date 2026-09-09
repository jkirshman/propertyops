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

/**
 * Whether a Work Order in this status still represents open PM work — the
 * gate `generatePreventiveMaintenanceOccurrence` uses to decide whether a new
 * occurrence would duplicate one already in flight. Equivalent to asking
 * whether the status classifies as "generated" (neither completed nor
 * cancelled) under `mapWorkOrderStatusToOccurrenceStatus`.
 */
export function isNonTerminalWorkOrderStatus(status: WorkOrderStatus): boolean {
  return mapWorkOrderStatusToOccurrenceStatus(status) === "generated";
}
