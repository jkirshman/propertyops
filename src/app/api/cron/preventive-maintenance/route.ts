import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";
import { createNotification } from "@/lib/notifications/notifications";
import { buildPmPlanOverdueNotification } from "@/lib/preventive-maintenance/notification-events";
import { generatePreventiveMaintenanceOccurrence } from "@/lib/preventive-maintenance/occurrences";
import { listPreventiveMaintenancePlans } from "@/lib/preventive-maintenance/plans";
import { todayDateString } from "@/lib/preventive-maintenance/recurrence";

/**
 * Daily preventive-maintenance job: generates due occurrences org by org and
 * flags plans that missed their scheduled due date. Idempotent — the unique
 * (planId, dueDate) constraint means re-running this any number of times for
 * the same day never creates duplicate work orders. Recommended schedule:
 * once daily (e.g. 06:00 UTC).
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayDateString();
  const orgs = await db.select({ id: organizations.id }).from(organizations);

  let generated = 0;
  let overdueNotified = 0;
  let skipped = 0;
  let errors = 0;

  for (const org of orgs) {
    const plans = await listPreventiveMaintenancePlans(org.id, { isActive: true });

    for (const plan of plans) {
      try {
        if (plan.nextDueAt < today && plan.defaultAssigneeUserId) {
          const notification = await createNotification({
            organizationId: org.id,
            recipientUserId: plan.defaultAssigneeUserId,
            ...buildPmPlanOverdueNotification(plan.id, plan.name, plan.nextDueAt),
          });
          if (notification) overdueNotified += 1;
        }

        // Generation itself (audit event + assignee notification) is fully
        // handled inside the shared service — do not duplicate either here.
        const result = await generatePreventiveMaintenanceOccurrence(org.id, plan, {
          requireDue: true,
        });

        if (result.status === "generated") {
          generated += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        errors += 1;
        console.error(
          `preventive-maintenance cron: failed to process plan ${plan.id}`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  return NextResponse.json({ ok: true, generated, overdueNotified, skipped, errors });
}
