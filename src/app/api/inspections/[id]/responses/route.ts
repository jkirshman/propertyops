import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { getAccessibleInspection } from "@/lib/inspections/inspection-access";
import { listInspectionResponses } from "@/lib/inspections/responses";

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

  // UNIT-OPS-1: another Unit's Inspection is a 404, same as another Property's.
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  const inspection = await getAccessibleInspection(user.organizationId, scope, id);
  if (!inspection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const responses = await listInspectionResponses(context.user.organizationId, id);
  return NextResponse.json({ responses });
}
