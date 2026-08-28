import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getAsset, updateAsset } from "@/lib/assets/assets";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ASSET_CAPABILITIES.RETIRE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const existing = await getAsset(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.status !== "retired") {
    return NextResponse.json({ error: "not_retired" }, { status: 409 });
  }

  // retiredDate/disposalReason are left in place as a historical record of
  // why the asset was previously retired, even after reactivation.
  const updated = await updateAsset(user.organizationId, id, {
    status: existing.assignmentType === "unassigned" ? "available" : "assigned",
    isActive: true,
  });

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "asset.reactivated",
    entityType: "asset",
    entityId: id,
    before: { status: existing.status },
    after: { status: updated?.status },
  });

  return NextResponse.json({ asset: updated });
}
