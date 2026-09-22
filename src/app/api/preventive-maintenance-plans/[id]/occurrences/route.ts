import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { listOccurrencesForPlan } from "@/lib/preventive-maintenance/occurrences";
import { canAccessPreventiveMaintenancePlan } from "@/lib/preventive-maintenance/plan-access";
import { getPreventiveMaintenancePlan } from "@/lib/preventive-maintenance/plans";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const plan = await getPreventiveMaintenancePlan(user.organizationId, id);
  if (!plan) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!(await canAccessPreventiveMaintenancePlan(user.organizationId, scope, plan))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const occurrences = await listOccurrencesForPlan(context.user.organizationId, id);
  return NextResponse.json({ occurrences });
}
