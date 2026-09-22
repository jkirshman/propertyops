import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { listEntityActivity } from "@/lib/audit/list-entity-activity";
import { TENANT_CAPABILITIES } from "@/lib/tenants/constants";
import { tenantHasAccessibleLease } from "@/lib/tenants/tenants";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(TENANT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  if (scope.kind !== "all" && !(await tenantHasAccessibleLease(context.user.organizationId, id, scope))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const activity = await listEntityActivity(context.user.organizationId, "tenant", id);
  return NextResponse.json({ activity });
}
