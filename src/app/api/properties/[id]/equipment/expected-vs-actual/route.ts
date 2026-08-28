import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { getExpectedVsActualForProperty } from "@/lib/equipment/expected-vs-actual";
import { getProperty } from "@/lib/properties/properties";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const property = await getProperty(context.user.organizationId, id);
  if (!property) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const comparison = await getExpectedVsActualForProperty(context.user.organizationId, property);
  return NextResponse.json(comparison);
}
