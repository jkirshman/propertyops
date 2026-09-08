import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { getInspection } from "@/lib/inspections/inspections";
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
  const inspection = await getInspection(context.user.organizationId, id);
  if (!inspection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const responses = await listInspectionResponses(context.user.organizationId, id);
  return NextResponse.json({ responses });
}
