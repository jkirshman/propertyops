import { canManagePropertyLifecycle } from "@/lib/admin/admin-hub-config";
import { getEffectiveLeaseStatus } from "@/lib/leases/status";
import type { LeaseStatus } from "@/lib/leases/constants";

// LIFECYCLE-1: Property archive rules, kept pure so they can be unit tested.
//
// "Archived" is the existing `properties.is_active = false` state — PropertyOps
// already treated an inactive Property as "not selectable for new work", it
// just had no UI to reach it. Reusing it (rather than adding archived_at next
// to is_active) keeps one lifecycle flag; who/when lives in audit_log.

export const PROPERTY_ARCHIVED_ERROR = "property_archived";

export const PROPERTY_ARCHIVED_MESSAGE =
  "This property is archived. Restore it before adding new records.";

export function isPropertyArchived(property: { isActive: boolean }): boolean {
  return !property.isActive;
}

/**
 * Archive/restore reuse the existing Property-management permission
 * (property.edit). LIFECYCLE-1A moved the controls into Admin Hub, so Admin
 * Hub access is also required — a Manager with property.edit alone can no
 * longer archive/restore, through the UI or the API.
 */
export function canArchiveProperty(capabilityKeys: readonly string[]): boolean {
  return canManagePropertyLifecycle(capabilityKeys);
}

export type ArchiveTransition = "archive" | "restore";

export type ArchiveTransitionResult =
  | { ok: true; isActive: boolean; auditAction: "property.archived" | "property.restored" }
  | { ok: false; error: "already_archived" | "not_archived" };

export function planArchiveTransition(
  property: { isActive: boolean },
  transition: ArchiveTransition,
): ArchiveTransitionResult {
  if (transition === "archive") {
    return property.isActive
      ? { ok: true, isActive: false, auditAction: "property.archived" }
      : { ok: false, error: "already_archived" };
  }
  return property.isActive
    ? { ok: false, error: "not_archived" }
    : { ok: true, isActive: true, auditAction: "property.restored" };
}

export interface ArchiveImpactCounts {
  openWorkOrders: number;
  activePmPlans: number;
  openInspections: number;
  activeLeases: number;
}

const OPEN_INSPECTION_STATUSES = new Set(["draft", "in_progress"]);

export function countOpenInspections(rows: readonly { status: string }[]): number {
  return rows.filter((row) => OPEN_INSPECTION_STATUSES.has(row.status)).length;
}

/** Leases that still describe a current or future occupancy (not expired/terminated/draft). */
export function countActiveLeases(
  rows: readonly { status: string; startDate: string; endDate: string | null }[],
  today?: string,
): number {
  return rows.filter((row) => {
    const effective = getEffectiveLeaseStatus(row.status as LeaseStatus, row.startDate, row.endDate, today);
    return effective === "active" || effective === "upcoming" || effective === "month_to_month";
  }).length;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Human-readable lines for the archive confirmation; empty when nothing is active. */
export function describeArchiveImpact(counts: ArchiveImpactCounts): string[] {
  const lines: string[] = [];
  if (counts.openWorkOrders > 0) lines.push(plural(counts.openWorkOrders, "open Work Order", "open Work Orders"));
  if (counts.activePmPlans > 0) {
    lines.push(plural(counts.activePmPlans, "active Preventive Maintenance plan", "active Preventive Maintenance plans"));
  }
  if (counts.openInspections > 0) {
    lines.push(plural(counts.openInspections, "open Inspection", "open Inspections"));
  }
  if (counts.activeLeases > 0) lines.push(plural(counts.activeLeases, "active Lease", "active Leases"));
  return lines;
}

/**
 * Record-history requests — a Property tab, or an Equipment/Component/Asset
 * detail panel — are anchored to one record and must keep showing an
 * archived Property's history. Everything else is a normal operational list
 * and excludes archived Properties. Vendor and Tenant history panels share
 * their filter keys with global-list dropdowns, so they opt in explicitly
 * with `includeArchived=true` instead of being inferred.
 */
const HISTORY_ANCHOR_PARAMS = ["propertyId", "propertyEquipmentId", "propertyComponentId", "assetId"] as const;

export const INCLUDE_ARCHIVED_PARAM = "includeArchived";

export function listRequestIncludesArchived(searchParams: URLSearchParams): boolean {
  if (searchParams.get(INCLUDE_ARCHIVED_PARAM) === "true") {
    return true;
  }
  return HISTORY_ANCHOR_PARAMS.some((key) => Boolean(searchParams.get(key)));
}
