import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getUser } from "@/lib/users/users";
import { removeUserPropertyAccess } from "@/lib/users/user-property-access";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; accessId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, accessId } = await params;
  const { user: actor } = context;

  const targetUser = await getUser(actor.organizationId, id);
  if (!targetUser) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const removed = await removeUserPropertyAccess(actor.organizationId, id, accessId);
  if (!removed) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "user_property_access.removed",
    entityType: "user_property_access",
    entityId: removed.id,
    before: removed,
  });

  return NextResponse.json({ ok: true });
}
