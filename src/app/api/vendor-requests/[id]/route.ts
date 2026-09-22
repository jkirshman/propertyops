import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { createNotification } from "@/lib/notifications/notifications";
import { reviewVendorSubmissionSchema } from "@/lib/validation/vendors";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { getVendorForReview, reviewVendorSubmission } from "@/lib/vendors/vendors";
import {
  buildVendorApprovedNotification,
  buildVendorRejectedNotification,
} from "@/lib/vendors/notification-events";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.APPROVE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const vendor = await getVendorForReview(user.organizationId, id);
  if (!vendor || vendor.approvalStatus !== "pending") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, context.capabilityKeys);
  if (!vendor.submissionPropertyId || !canAccessProperty(scope, vendor.submissionPropertyId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewVendorSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await reviewVendorSubmission(
    user.organizationId,
    id,
    user.id,
    parsed.data.decision,
    parsed.data.reviewNotes,
  );
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: parsed.data.decision === "approved" ? "vendor.approved" : "vendor.rejected",
    entityType: "vendor",
    entityId: updated.id,
    before: { approvalStatus: vendor.approvalStatus },
    after: { approvalStatus: updated.approvalStatus, reviewNotes: updated.reviewNotes },
  });

  if (updated.submittedByUserId) {
    const notification =
      parsed.data.decision === "approved"
        ? buildVendorApprovedNotification(updated)
        : buildVendorRejectedNotification(updated, updated.reviewNotes);
    await createNotification({
      organizationId: user.organizationId,
      recipientUserId: updated.submittedByUserId,
      actorUserId: user.id,
      ...notification,
    });
  }

  return NextResponse.json({ vendor: updated });
}
