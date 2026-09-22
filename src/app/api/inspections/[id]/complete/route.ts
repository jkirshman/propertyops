import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { listUserIdsWithCapabilityForProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { completeInspection } from "@/lib/inspections/inspections";
import { getAccessibleInspection } from "@/lib/inspections/inspection-access";
import { buildInspectionCompletedWithFindingsNotification } from "@/lib/inspections/notification-events";
import { createNotification } from "@/lib/notifications/notifications";

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

  // UNIT-OPS-1: another Unit's Inspection is a 404, same as another Property's.
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  const inspection = await getAccessibleInspection(user.organizationId, scope, id);
  if (!inspection) {
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
    // UNIT-OPS-1: editors who can see this Inspection — its Property and, if
    // Unit-owned, its Unit. (Previously every editor org-wide was notified,
    // including ones with no access to the Property at all.)
    const recipientIds = await listUserIdsWithCapabilityForProperty(
      user.organizationId,
      result.inspection.propertyId,
      INSPECTION_CAPABILITIES.EDIT,
      result.inspection.propertyUnitId,
    );
    for (const recipientId of recipientIds) {
      if (recipientId === user.id) continue;
      await createNotification({
        organizationId: user.organizationId,
        recipientUserId: recipientId,
        actorUserId: user.id,
        ...notification,
      });
    }
  }

  return NextResponse.json({ inspection: result.inspection });
}
