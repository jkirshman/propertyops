import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessPropertyUnit, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { listEntityActivity } from "@/lib/audit/list-entity-activity";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { getLease } from "@/lib/leases/leases";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(LEASE_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const lease = await getLease(context.user.organizationId, id);
  if (!lease) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  if (!canAccessPropertyUnit(scope, lease.propertyId, lease.propertyUnitId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const activity = await listEntityActivity(context.user.organizationId, "lease", id);
  return NextResponse.json({ activity });
}
