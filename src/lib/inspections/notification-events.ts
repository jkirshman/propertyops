import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

export interface InspectionNotificationSubject {
  id: string;
  templateName: string;
  overallResult: string | null;
}

export function buildInspectionScheduledNotification(inspection: { id: string; templateName: string }) {
  return {
    type: NOTIFICATION_TYPES.INSPECTION_SCHEDULED,
    title: `Scheduled: ${inspection.templateName}`,
    deepLinkUrl: `/inspections/${inspection.id}`,
    relatedEntityType: "inspection",
    relatedEntityId: inspection.id,
  };
}

export function buildInspectionRescheduledNotification(inspection: { id: string; templateName: string }) {
  return {
    type: NOTIFICATION_TYPES.INSPECTION_RESCHEDULED,
    title: `Rescheduled: ${inspection.templateName}`,
    deepLinkUrl: `/inspections/${inspection.id}`,
    relatedEntityType: "inspection",
    relatedEntityId: inspection.id,
  };
}

export function buildInspectionCompletedWithFindingsNotification(inspection: InspectionNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.INSPECTION_COMPLETED_WITH_FINDINGS,
    title: `Inspection completed with findings: ${inspection.templateName}`,
    body:
      inspection.overallResult === "failed"
        ? "One or more required items failed."
        : "Completed with non-required findings.",
    deepLinkUrl: `/inspections/${inspection.id}`,
    relatedEntityType: "inspection",
    relatedEntityId: inspection.id,
  };
}
