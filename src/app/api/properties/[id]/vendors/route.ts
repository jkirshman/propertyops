import { NextResponse } from "next/server";

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
  const vendors = await listVendorsCoveringProperty(context.user.organizationId, id);
  return NextResponse.json({ vendors });
}
