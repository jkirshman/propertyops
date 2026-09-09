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
import { type NotificationCategory } from "@/lib/notifications/categories";
import { getNotificationPreferencesForUser } from "@/lib/notifications/preferences";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { listPreventiveMaintenancePlans } from "@/lib/preventive-maintenance/plans";
import { listProperties } from "@/lib/properties/properties";
import { WORK_ORDER_CAPABILITIES, WORK_ORDER_STALE_THRESHOLD_DAYS } from "@/lib/work-orders/constants";
import { isWorkOrderOverdue, isWorkOrderUrgentPriority } from "@/lib/work-orders/attention";
import { listOpenWorkOrdersForBrief } from "@/lib/work-orders/work-orders";

// Maps every Home App Brief section to the Notification Preferences category
// that controls its visibility. `as const satisfies` keeps this exhaustive
// against NotificationCategory at compile time — adding a section without
// mapping it here (or mapping it to a made-up category) is a type error.
export const APP_BRIEF_SECTION_CATEGORY = {
  overdueWorkOrders: "work_orders",
  urgentWorkOrders: "work_orders",
  duePmPlans: "preventive_maintenance",
  dueInspections: "inspections",
  expiringCompliance: "compliance",
  leaseMilestones: "leases",
  attentionEquipment: "equipment_assets",
} as const satisfies Record<string, NotificationCategory>;

/**
 * A Home App Brief section renders only if the user is BOTH authorized
 * (capability) AND has not turned that category's App Brief preference off.
 * Authorization is always authoritative — a preference can only narrow what
 * renders, never expand it, so this is a strict AND with no fallback branch.
 */
export function isAppBriefSectionVisible(hasCapability: boolean, appBriefPreferenceEnabled: boolean): boolean {
  return hasCapability && appBriefPreferenceEnabled;
}

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
  // True if the user's role grants at least one module VIEW capability the
  // brief draws on — independent of App Brief preferences. Lets the Home UI
  // distinguish "your role has no App Brief sections" from "you turned every
  // section off," which need different empty-state copy.
  hasCapabilityForAnySection: boolean;
}

/**
 * Personalized "what needs my attention" data for the Home App Brief.
 * Personalization is capability-only for authorization (no property/location
 * access-scoping model exists yet), narrowed further by each category's App
 * Brief preference. A section is `null` (not rendered at all, and never
 * queried) when the caller lacks that module's VIEW capability OR has turned
 * that category's App Brief preference off; an empty-but-present section
 * means both checks passed and there's simply nothing due. Preferences never
 * expand what capability already restricts — see `isAppBriefSectionVisible`.
 */
export async function getAppBrief(
  organizationId: string,
  capabilityKeys: string[],
  userId: string,
): Promise<AppBrief> {
  const today = todayDateString();
  const has = (capability: string) => capabilityKeys.includes(capability);

  const appBriefPreferences = await getNotificationPreferencesForUser(userId);
  const appBriefEnabledByCategory = new Map(
    appBriefPreferences.map((preference) => [preference.category, preference.appBriefEnabled]),
  );
  // Defaults to true (visible) for a category with no explicit row, matching
  // getNotificationPreferencesForUser's own default — see that function.
  const briefEnabled = (category: NotificationCategory) => appBriefEnabledByCategory.get(category) ?? true;

  const workOrdersVisible = isAppBriefSectionVisible(
    has(WORK_ORDER_CAPABILITIES.VIEW),
    briefEnabled(APP_BRIEF_SECTION_CATEGORY.overdueWorkOrders),
  );
  const pmVisible = isAppBriefSectionVisible(
    has(PREVENTIVE_MAINTENANCE_CAPABILITIES.VIEW),
    briefEnabled(APP_BRIEF_SECTION_CATEGORY.duePmPlans),
  );
  const complianceVisible = isAppBriefSectionVisible(
    has(COMPLIANCE_CAPABILITIES.VIEW),
    briefEnabled(APP_BRIEF_SECTION_CATEGORY.expiringCompliance),
  );
  const leasesVisible = isAppBriefSectionVisible(
    has(LEASE_CAPABILITIES.VIEW),
    briefEnabled(APP_BRIEF_SECTION_CATEGORY.leaseMilestones),
  );
  const inspectionsVisible = isAppBriefSectionVisible(
    has(INSPECTION_CAPABILITIES.VIEW),
    briefEnabled(APP_BRIEF_SECTION_CATEGORY.dueInspections),
  );
  const equipmentVisible = isAppBriefSectionVisible(
    has(EQUIPMENT_CAPABILITIES.VIEW),
    briefEnabled(APP_BRIEF_SECTION_CATEGORY.attentionEquipment),
  );

  const [workOrderRows, pmRows, complianceRows, leaseRows, inspectionRows, equipmentRows] = await Promise.all([
    workOrdersVisible ? listOpenWorkOrdersForBrief(organizationId) : null,
    pmVisible ? listPreventiveMaintenancePlans(organizationId, { isActive: true }) : null,
    complianceVisible ? listComplianceRecords(organizationId, { isActive: true }) : null,
    leasesVisible ? listLeases(organizationId) : null,
    inspectionsVisible ? listInspections(organizationId) : null,
    equipmentVisible ? listPropertyEquipmentNeedingAttention(organizationId) : null,
  ]);

  const hasCapabilityForAnySection = [
    WORK_ORDER_CAPABILITIES.VIEW,
    PREVENTIVE_MAINTENANCE_CAPABILITIES.VIEW,
    COMPLIANCE_CAPABILITIES.VIEW,
    LEASE_CAPABILITIES.VIEW,
    INSPECTION_CAPABILITIES.VIEW,
    EQUIPMENT_CAPABILITIES.VIEW,
  ].some(has);

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
    hasCapabilityForAnySection,
  };
}
