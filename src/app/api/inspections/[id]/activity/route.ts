import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { listEntityActivity } from "@/lib/audit/list-entity-activity";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { getInspection } from "@/lib/inspections/inspections";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(INSPECTION_CAPABILITIES.VIEW)) {
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

  const activity = await listEntityActivity(context.user.organizationId, "inspection", id);
  return NextResponse.json({ activity });
}
