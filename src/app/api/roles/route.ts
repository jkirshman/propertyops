import { NextResponse } from "next/server";

import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { listRolesWithCapabilities } from "@/lib/roles/roles";

// Either capability is sufficient to read the list: assigning a role to a
// user (users.manage) needs the same role list as inspecting roles
// (roles.manage) — same "reference data" pattern as property companies.
export async function GET() {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const canView =
    context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS) ||
    context.capabilityKeys.includes(ADMIN_CAPABILITIES.ROLES);
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const roles = await listRolesWithCapabilities(context.user.organizationId);
  return NextResponse.json({ roles });
}
