import type { WorkOrderStatus } from "@/lib/work-orders/constants";

/**
 * Any status may move to any other status manually — PROP-3 intentionally has
 * no workflow designer or restricted transition graph. The only automatic
 * behavior is stamping resolvedAt/closedAt when a work order newly enters
 * those states. Timestamps are never cleared on reopen — the live row keeps
 * "when was this last resolved/closed", and the audit log preserves the full
 * transition history regardless.
 */
export function computeStatusTimestampUpdates(
  newStatus: WorkOrderStatus,
  now: Date,
): { resolvedAt?: Date; closedAt?: Date } {
  if (newStatus === "resolved") {
    return { resolvedAt: now };
  }
  if (newStatus === "closed") {
    return { closedAt: now };
  }
  return {};
}
