import { COMPLIANCE_CAPABILITIES } from "@/lib/compliance/constants";
import { listComplianceRecords } from "@/lib/compliance/compliance";
import { classifyComplianceRecordStatus } from "@/lib/compliance/status";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { listPropertyEquipmentNeedingAttention } from "@/lib/equipment/property-equipment";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { listInspections } from "@/lib/inspections/inspections";
import {
  LEASE_CAPABILITIES,
  LEASE_DATE_APPROACHING_THRESHOLD_DAYS,
  LEASE_EXPIRING_THRESHOLDS_DAYS,
  type LeaseStatus,
} from "@/lib/leases/constants";
import { isDateApproaching, isLeaseExpiringWithin } from "@/lib/leases/alerts";
import { listLeases } from "@/lib/leases/leases";
import { getEffectiveLeaseStatus } from "@/lib/leases/status";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { listPreventiveMaintenancePlans } from "@/lib/preventive-maintenance/plans";
import { listProperties } from "@/lib/properties/properties";
import { WORK_ORDER_CAPABILITIES, WORK_ORDER_STALE_THRESHOLD_DAYS } from "@/lib/work-orders/constants";
import { isWorkOrderOverdue, isWorkOrderUrgentPriority } from "@/lib/work-orders/attention";
import { listOpenWorkOrdersForBrief } from "@/lib/work-orders/work-orders";

// Inspections have no existing "due soon" classifier (unlike PM/leases/
// compliance) — this is the one new threshold this module introduces.
const INSPECTION_DUE_SOON_THRESHOLD_DAYS = 7;

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface AppBriefSection<T> {
  items: T[];
  totalCount: number;
}

function cap<T>(items: T[], limit: number): AppBriefSection<T> {
  return { items: items.slice(0, limit), totalCount: items.length };
}

export interface AppBriefWorkOrderItem {
  id: string;
  number: string;
  subject: string;
  priority: string;
  status: string;
  openedAt: Date;
  propertyId: string;
  propertyName: string;
}

export function selectOverdueWorkOrders(
  rows: AppBriefWorkOrderItem[],
  today?: string,
  limit = 5,
): AppBriefSection<AppBriefWorkOrderItem> {
  const matches = rows
    .filter((row) => isWorkOrderOverdue(row.openedAt, WORK_ORDER_STALE_THRESHOLD_DAYS, today))
    .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  return cap(matches, limit);
}

export function selectUrgentWorkOrders(
  rows: AppBriefWorkOrderItem[],
  limit = 5,
): AppBriefSection<AppBriefWorkOrderItem> {
  const rank = (priority: string) => (priority === "urgent" ? 0 : 1);
  const matches = rows
    .filter((row) => isWorkOrderUrgentPriority(row.priority))
    .sort((a, b) => rank(a.priority) - rank(b.priority) || a.openedAt.getTime() - b.openedAt.getTime());
  return cap(matches, limit);
}

export interface AppBriefPmPlanItem {
  id: string;
  name: string;
  nextDueAt: string;
  propertyId: string;
  propertyName: string;
}

export function selectDuePmPlans(
  rows: AppBriefPmPlanItem[],
  today: string = todayDateString(),
  limit = 5,
): AppBriefSection<AppBriefPmPlanItem> {
  const matches = rows
    .filter((row) => row.nextDueAt <= today)
    .sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt));
  return cap(matches, limit);
}

export interface AppBriefInspectionItem {
  id: string;
  templateName: string;
  scheduledDate: string | null;
  status: string;
  propertyId: string;
  propertyName: string;
}

export function selectDueInspections(
  rows: AppBriefInspectionItem[],
  today: string = todayDateString(),
  thresholdDays: number = INSPECTION_DUE_SOON_THRESHOLD_DAYS,
  limit = 5,
): AppBriefSection<AppBriefInspectionItem> {
  const matches = rows
    .filter((row) => {
      if (row.status === "completed" || row.status === "cancelled") return false;
      if (!row.scheduledDate) return false;
      return row.scheduledDate < today || isDateApproaching(row.scheduledDate, thresholdDays, today);
    })
    .sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? ""));
  return cap(matches, limit);
}

export interface AppBriefComplianceItem {
  id: string;
  name: string;
  expirationDate: string | null;
  propertyId: string;
  propertyName: string;
}

export function selectExpiringCompliance(
  rows: AppBriefComplianceItem[],
  today: string = todayDateString(),
  limit = 5,
): AppBriefSection<AppBriefComplianceItem & { status: "expired" | "expiring_soon" }> {
  const matches = rows
    .map((row) => ({ ...row, status: classifyComplianceRecordStatus(row.expirationDate, today) }))
    .filter(
      (row): row is AppBriefComplianceItem & { status: "expired" | "expiring_soon" } =>
        row.status === "expired" || row.status === "expiring_soon",
    )
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "expired" ? -1 : 1;
      return (a.expirationDate ?? "").localeCompare(b.expirationDate ?? "");
    });
  return cap(matches, limit);
}

export interface AppBriefLeaseItem {
  id: string;
  label: string;
  status: string;
  startDate: string;
  endDate: string | null;
  noticeDate: string | null;
  renewalOptionDate: string | null;
  propertyId: string;
  propertyName: string;
}

export function selectLeaseMilestones(
  rows: AppBriefLeaseItem[],
  today: string = todayDateString(),
  limit = 5,
): AppBriefSection<AppBriefLeaseItem> {
  const matches = rows.filter((row) => {
    const effective = getEffectiveLeaseStatus(row.status as LeaseStatus, row.startDate, row.endDate, today);
    if (effective === "terminated" || effective === "draft" || effective === "expired") {
      return false;
    }
    return (
      isLeaseExpiringWithin(row.endDate, LEASE_EXPIRING_THRESHOLDS_DAYS[0], today) ||
      isDateApproaching(row.noticeDate, LEASE_DATE_APPROACHING_THRESHOLD_DAYS, today) ||
      isDateApproaching(row.renewalOptionDate, LEASE_DATE_APPROACHING_THRESHOLD_DAYS, today)
    );
  });
  return cap(matches, limit);
}

export interface AppBriefEquipmentItem {
  id: string;
  displayName: string;
  condition: string;
  status: string;
  propertyId: string;
  propertyName: string;
}

export function selectAttentionEquipment(
  rows: AppBriefEquipmentItem[],
  limit = 5,
): AppBriefSection<AppBriefEquipmentItem> {
  return cap(rows, limit);
}

export interface AppBrief {
  overdueWorkOrders: AppBriefSection<AppBriefWorkOrderItem> | null;
  urgentWorkOrders: AppBriefSection<AppBriefWorkOrderItem> | null;
  duePmPlans: AppBriefSection<AppBriefPmPlanItem> | null;
  dueInspections: AppBriefSection<AppBriefInspectionItem> | null;
  expiringCompliance: AppBriefSection<AppBriefComplianceItem & { status: "expired" | "expiring_soon" }> | null;
  leaseMilestones: AppBriefSection<AppBriefLeaseItem> | null;
  attentionEquipment: AppBriefSection<AppBriefEquipmentItem> | null;
}

/**
 * Personalized "what needs my attention" data for the Home App Brief.
 * Personalization is capability-only (no property/location access-scoping
 * model exists yet) — a section is `null` (not rendered at all) when the
 * caller lacks that module's VIEW capability, vs. an empty-but-present
 * section when the capability is granted and there's simply nothing due.
 */
export async function getAppBrief(organizationId: string, capabilityKeys: string[]): Promise<AppBrief> {
  const today = todayDateString();
  const has = (capability: string) => capabilityKeys.includes(capability);

  const [workOrderRows, pmRows, complianceRows, leaseRows, inspectionRows, equipmentRows] = await Promise.all([
    has(WORK_ORDER_CAPABILITIES.VIEW) ? listOpenWorkOrdersForBrief(organizationId) : null,
    has(PREVENTIVE_MAINTENANCE_CAPABILITIES.VIEW)
      ? listPreventiveMaintenancePlans(organizationId, { isActive: true })
      : null,
    has(COMPLIANCE_CAPABILITIES.VIEW) ? listComplianceRecords(organizationId, { isActive: true }) : null,
    has(LEASE_CAPABILITIES.VIEW) ? listLeases(organizationId) : null,
    has(INSPECTION_CAPABILITIES.VIEW) ? listInspections(organizationId) : null,
    has(EQUIPMENT_CAPABILITIES.VIEW) ? listPropertyEquipmentNeedingAttention(organizationId) : null,
  ]);

  // PM/compliance/lease/inspection list functions don't join property name —
  // resolved once here rather than adding a join to each of those
  // well-established, reused-elsewhere query functions.
  const needsPropertyNames = Boolean(pmRows || complianceRows || leaseRows || inspectionRows);
  const propertyNameById = needsPropertyNames
    ? new Map((await listProperties(organizationId)).map((property) => [property.id, property.name]))
    : new Map<string, string>();
  const nameFor = (propertyId: string) => propertyNameById.get(propertyId) ?? "Unknown property";

  return {
    overdueWorkOrders: workOrderRows ? selectOverdueWorkOrders(workOrderRows, today) : null,
    urgentWorkOrders: workOrderRows ? selectUrgentWorkOrders(workOrderRows) : null,
    duePmPlans: pmRows
      ? selectDuePmPlans(
          pmRows.map((row) => ({
            id: row.id,
            name: row.name,
            nextDueAt: row.nextDueAt,
            propertyId: row.propertyId,
            propertyName: nameFor(row.propertyId),
          })),
          today,
        )
      : null,
    dueInspections: inspectionRows
      ? selectDueInspections(
          inspectionRows.map((row) => ({
            id: row.id,
            templateName: row.templateName,
            scheduledDate: row.scheduledDate,
            status: row.status,
            propertyId: row.propertyId,
            propertyName: nameFor(row.propertyId),
          })),
          today,
        )
      : null,
    expiringCompliance: complianceRows
      ? selectExpiringCompliance(
          complianceRows.map((row) => ({
            id: row.id,
            name: row.name,
            expirationDate: row.expirationDate,
            propertyId: row.propertyId,
            propertyName: nameFor(row.propertyId),
          })),
          today,
        )
      : null,
    leaseMilestones: leaseRows
      ? selectLeaseMilestones(
          leaseRows.map((row) => ({
            id: row.id,
            label: row.label,
            status: row.status,
            startDate: row.startDate,
            endDate: row.endDate,
            noticeDate: row.noticeDate,
            renewalOptionDate: row.renewalOptionDate,
            propertyId: row.propertyId,
            propertyName: nameFor(row.propertyId),
          })),
          today,
        )
      : null,
    attentionEquipment: equipmentRows
      ? selectAttentionEquipment(
          equipmentRows.map((row) => ({ ...row, propertyName: row.propertyName })),
        )
      : null,
  };
}
