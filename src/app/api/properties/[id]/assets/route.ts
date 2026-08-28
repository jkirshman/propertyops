import { NextResponse } from "next/server";

import { listAssets } from "@/lib/assets/assets";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ASSET_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const assets = await listAssets(context.user.organizationId, { propertyId: id });
  return NextResponse.json({ assets });
}
