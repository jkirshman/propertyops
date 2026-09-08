import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { COMPLIANCE_CAPABILITIES } from "@/lib/compliance/constants";
import { listComplianceRecords } from "@/lib/compliance/compliance";
import { buildComplianceExpiredNotification, buildComplianceExpiringSoonNotification } from "@/lib/compliance/notification-events";
import { classifyComplianceRecordStatus } from "@/lib/compliance/status";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";
import { createNotification } from "@/lib/notifications/notifications";
import { listUsersWithCapability } from "@/lib/users/users";

/**
 * Daily compliance-expiration job: flags active compliance records that are
 * expiring soon or already expired. Idempotent via durable per-record,
 * per-expiration-date dedupe keys on the notification itself — re-running
 * this any number of times for the same day never re-notifies anyone who's
 * already seen the flag for that exact expiration date. Recommended
 * schedule: once daily (e.g. 06:30 UTC, after the PM cron).
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orgs = await db.select({ id: organizations.id }).from(organizations);

  let expiringSoonNotified = 0;
  let expiredNotified = 0;
  let errors = 0;

  for (const org of orgs) {
    try {
      const records = await listComplianceRecords(org.id, { isActive: true });
      const recipients = await listUsersWithCapability(org.id, COMPLIANCE_CAPABILITIES.EDIT);
      if (recipients.length === 0) continue;

      for (const record of records) {
        if (!record.expirationDate) continue;

        const status = classifyComplianceRecordStatus(record.expirationDate);
        if (status !== "expiring_soon" && status !== "expired") continue;

        const notification =
          status === "expiring_soon"
            ? buildComplianceExpiringSoonNotification({
                id: record.id,
                name: record.name,
                expirationDate: record.expirationDate,
              })
            : buildComplianceExpiredNotification({
                id: record.id,
                name: record.name,
                expirationDate: record.expirationDate,
              });

        for (const recipient of recipients) {
          const created = await createNotification({
            organizationId: org.id,
            recipientUserId: recipient.id,
            ...notification,
          });
          if (created) {
            if (status === "expiring_soon") expiringSoonNotified += 1;
            else expiredNotified += 1;
          }
        }
      }
    } catch (error) {
      errors += 1;
      console.error(
        `compliance-check cron: failed to process organization ${org.id}`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return NextResponse.json({ ok: true, expiringSoonNotified, expiredNotified, errors });
}
