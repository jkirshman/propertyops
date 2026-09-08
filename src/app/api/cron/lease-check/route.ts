import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { isDateApproaching, isLeaseExpired, isLeaseExpiringWithin } from "@/lib/leases/alerts";
import {
  LEASE_CAPABILITIES,
  LEASE_DATE_APPROACHING_THRESHOLD_DAYS,
  LEASE_EXPIRING_THRESHOLDS_DAYS,
} from "@/lib/leases/constants";
import { listLeases } from "@/lib/leases/leases";
import {
  buildLeaseExpiredNotification,
  buildLeaseExpiringNotification,
  buildLeaseNoticeDateApproachingNotification,
  buildLeaseRenewalOptionApproachingNotification,
} from "@/lib/leases/notification-events";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";
import { createNotification } from "@/lib/notifications/notifications";
import { listUsersWithCapability } from "@/lib/users/users";

/**
 * Daily lease-date job: flags leases approaching expiration (90/60/30-day
 * escalating thresholds), already expired, or with a notice/renewal-option
 * date coming up. Idempotent via durable per-(lease, date, event) dedupe keys
 * on the notification itself — safe to rerun any number of times per day.
 * Only 'active' and 'month_to_month' leases are considered — draft/terminated
 * leases never generate date alerts. Recommended schedule: once daily.
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orgs = await db.select({ id: organizations.id }).from(organizations);

  let expiringNotified = 0;
  let expiredNotified = 0;
  let noticeDateNotified = 0;
  let renewalOptionNotified = 0;
  let errors = 0;

  for (const org of orgs) {
    try {
      const recipients = await listUsersWithCapability(org.id, LEASE_CAPABILITIES.EDIT);
      if (recipients.length === 0) continue;

      const activeLeases = await listLeases(org.id, { status: "active" });
      const monthToMonthLeases = await listLeases(org.id, { status: "month_to_month" });

      for (const lease of [...activeLeases, ...monthToMonthLeases]) {
        if (lease.endDate && isLeaseExpired(lease.endDate)) {
          const expiredNotification = buildLeaseExpiredNotification(lease, lease.endDate);
          for (const recipient of recipients) {
            const created = await createNotification({
              organizationId: org.id,
              recipientUserId: recipient.id,
              ...expiredNotification,
            });
            if (created) expiredNotified += 1;
          }
        } else if (lease.endDate) {
          for (const thresholdDays of LEASE_EXPIRING_THRESHOLDS_DAYS) {
            if (!isLeaseExpiringWithin(lease.endDate, thresholdDays)) continue;
            const expiringNotification = buildLeaseExpiringNotification(lease, lease.endDate, thresholdDays);
            for (const recipient of recipients) {
              const created = await createNotification({
                organizationId: org.id,
                recipientUserId: recipient.id,
                ...expiringNotification,
              });
              if (created) expiringNotified += 1;
            }
          }
        }

        if (
          lease.noticeDate &&
          isDateApproaching(lease.noticeDate, LEASE_DATE_APPROACHING_THRESHOLD_DAYS)
        ) {
          const noticeNotification = buildLeaseNoticeDateApproachingNotification(lease, lease.noticeDate);
          for (const recipient of recipients) {
            const created = await createNotification({
              organizationId: org.id,
              recipientUserId: recipient.id,
              ...noticeNotification,
            });
            if (created) noticeDateNotified += 1;
          }
        }

        if (
          lease.renewalOptionDate &&
          isDateApproaching(lease.renewalOptionDate, LEASE_DATE_APPROACHING_THRESHOLD_DAYS)
        ) {
          const renewalNotification = buildLeaseRenewalOptionApproachingNotification(
            lease,
            lease.renewalOptionDate,
          );
          for (const recipient of recipients) {
            const created = await createNotification({
              organizationId: org.id,
              recipientUserId: recipient.id,
              ...renewalNotification,
            });
            if (created) renewalOptionNotified += 1;
          }
        }
      }
    } catch (error) {
      errors += 1;
      console.error(
        `lease-check cron: failed to process organization ${org.id}`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    expiringNotified,
    expiredNotified,
    noticeDateNotified,
    renewalOptionNotified,
    errors,
  });
}
