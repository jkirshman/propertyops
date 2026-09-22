import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { completeInspection, getInspection } from "@/lib/inspections/inspections";
import { buildInspectionCompletedWithFindingsNotification } from "@/lib/inspections/notification-events";
import { createNotification } from "@/lib/notifications/notifications";
import { listUsersWithCapability } from "@/lib/users/users";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(INSPECTION_CAPABILITIES.COMPLETE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const inspection = await getInspection(user.organizationId, id);
  if (!inspection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, inspection.propertyId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await completeInspection(user.organizationId, id);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.reason === "incomplete_required_items") {
      return NextResponse.json(
        { error: "incomplete_required_items", incompleteItemLabels: result.incompleteItemLabels },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "already_finalized" }, { status: 409 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "inspection.completed",
    entityType: "inspection",
    entityId: id,
    after: { overallResult: result.inspection.overallResult },
  });

  if (result.inspection.overallResult !== "passed") {
    const notification = buildInspectionCompletedWithFindingsNotification(result.inspection);
    const recipients = await listUsersWithCapability(user.organizationId, INSPECTION_CAPABILITIES.EDIT);
    for (const recipient of recipients) {
      if (recipient.id === user.id) continue;
      await createNotification({
        organizationId: user.organizationId,
        recipientUserId: recipient.id,
        actorUserId: user.id,
        ...notification,
      });
    }
  }

  return NextResponse.json({ inspection: result.inspection });
}
