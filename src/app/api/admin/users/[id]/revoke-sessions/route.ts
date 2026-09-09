import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { getUser } from "@/lib/users/users";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user: actor } = context;

  const target = await getUser(actor.organizationId, id);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const revokedCount = await revokeAllSessionsForUser(id);

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "user.sessions_revoked",
    entityType: "user",
    entityId: id,
    after: { revokedCount },
  });

  return NextResponse.json({ revokedCount });
}
