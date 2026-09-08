import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

export interface LeaseNotificationSubject {
  id: string;
  label: string;
}

function deepLink(leaseId: string) {
  return `/leases/${leaseId}`;
}

export function buildLeaseExpiringNotification(lease: LeaseNotificationSubject, endDate: string, thresholdDays: number) {
  return {
    type: NOTIFICATION_TYPES.LEASE_EXPIRING,
    title: `Lease expires in ${thresholdDays} days: ${lease.label}`,
    body: `Expires ${endDate}.`,
    deepLinkUrl: deepLink(lease.id),
    relatedEntityType: "lease",
    relatedEntityId: lease.id,
    // Durable per-(lease, end date, threshold) dedupe — repeated daily cron
    // runs never re-notify for a threshold already flagged for this end date.
    dedupeKey: `lease_expiring_${thresholdDays}:${lease.id}:${endDate}`,
  };
}

export function buildLeaseExpiredNotification(lease: LeaseNotificationSubject, endDate: string) {
  return {
    type: NOTIFICATION_TYPES.LEASE_EXPIRED,
    title: `Lease expired: ${lease.label}`,
    body: `Expired ${endDate}.`,
    deepLinkUrl: deepLink(lease.id),
    relatedEntityType: "lease",
    relatedEntityId: lease.id,
    dedupeKey: `lease_expired:${lease.id}:${endDate}`,
  };
}

export function buildLeaseNoticeDateApproachingNotification(lease: LeaseNotificationSubject, noticeDate: string) {
  return {
    type: NOTIFICATION_TYPES.LEASE_NOTICE_DATE_APPROACHING,
    title: `Notice date approaching: ${lease.label}`,
    body: `Notice date is ${noticeDate}.`,
    deepLinkUrl: deepLink(lease.id),
    relatedEntityType: "lease",
    relatedEntityId: lease.id,
    dedupeKey: `lease_notice_date:${lease.id}:${noticeDate}`,
  };
}

export function buildLeaseRenewalOptionApproachingNotification(
  lease: LeaseNotificationSubject,
  renewalOptionDate: string,
) {
  return {
    type: NOTIFICATION_TYPES.LEASE_RENEWAL_OPTION_APPROACHING,
    title: `Renewal option date approaching: ${lease.label}`,
    body: `Renewal option date is ${renewalOptionDate}.`,
    deepLinkUrl: deepLink(lease.id),
    relatedEntityType: "lease",
    relatedEntityId: lease.id,
    dedupeKey: `lease_renewal_option:${lease.id}:${renewalOptionDate}`,
  };
}
