import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

export interface ComplianceNotificationSubject {
  id: string;
  name: string;
  expirationDate: string;
}

export function buildComplianceExpiringSoonNotification(record: ComplianceNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.COMPLIANCE_EXPIRING_SOON,
    title: `Compliance record expiring soon: ${record.name}`,
    body: `Expires ${record.expirationDate}.`,
    deepLinkUrl: `/properties`,
    relatedEntityType: "compliance_record",
    relatedEntityId: record.id,
    // Durable per-occurrence dedupe: repeated daily cron runs never re-notify
    // for the same expiration date once it's already been flagged.
    dedupeKey: `compliance_expiring:${record.id}:${record.expirationDate}`,
  };
}

export function buildComplianceExpiredNotification(record: ComplianceNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.COMPLIANCE_EXPIRED,
    title: `Compliance record expired: ${record.name}`,
    body: `Expired ${record.expirationDate}.`,
    deepLinkUrl: `/properties`,
    relatedEntityType: "compliance_record",
    relatedEntityId: record.id,
    dedupeKey: `compliance_expired:${record.id}:${record.expirationDate}`,
  };
}
