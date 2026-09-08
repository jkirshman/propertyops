import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { listEntityActivity } from "@/lib/audit/list-entity-activity";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(INSPECTION_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const activity = await listEntityActivity(context.user.organizationId, "inspection", id);
  return NextResponse.json({ activity });
}
