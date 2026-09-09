import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getRoleCapabilityKeys } from "@/lib/auth/capabilities";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { diffFields } from "@/lib/db/diff-fields";
import { wouldLeaveOrgWithoutUserAdmin } from "@/lib/users/last-admin-guard";
import { getRole } from "@/lib/roles/roles";
import { getRoleForOrganization, getUser, listActiveUserAdminIds, updateUser } from "@/lib/users/users";
import { updateUserSchema } from "@/lib/validation/users";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await getUser(context.user.organizationId, id);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const role = await getRole(context.user.organizationId, user.roleId);
  const capabilityKeys = await getRoleCapabilityKeys(user.roleId);

  return NextResponse.json({ user, roleName: role?.name ?? null, capabilityKeys });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user: actor } = context;

  const existing = await getUser(actor.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.roleId !== undefined) {
    const role = await getRoleForOrganization(actor.organizationId, parsed.data.roleId);
    if (!role) {
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    }
  }

  if (parsed.data.isActive === false) {
    const adminIds = await listActiveUserAdminIds(actor.organizationId);
    if (wouldLeaveOrgWithoutUserAdmin(adminIds, id)) {
      return NextResponse.json({ error: "last_admin" }, { status: 409 });
    }
  }

  const updated = await updateUser(actor.organizationId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (parsed.data.isActive === false) {
    await revokeAllSessionsForUser(id);
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    const action =
      parsed.data.roleId !== undefined
        ? "user.role_changed"
        : parsed.data.isActive !== undefined
          ? parsed.data.isActive
            ? "user.activated"
            : "user.deactivated"
          : "user.updated";

    await recordAuditEvent({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action,
      entityType: "user",
      entityId: id,
      before: diff.before,
      after: diff.after,
    });
  }

  return NextResponse.json({ user: updated });
}
