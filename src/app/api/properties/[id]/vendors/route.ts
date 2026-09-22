import { NextResponse } from "next/server";

import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { listVendorsCoveringProperty } from "@/lib/vendors/coverage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  if (!canAccessProperty(scope, id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const vendors = await listVendorsCoveringProperty(context.user.organizationId, id);
  return NextResponse.json({ vendors });
}
