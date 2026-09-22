import { NextResponse } from "next/server";

import { getAsset, isAssetVisibleForScope } from "@/lib/assets/assets";
import { listAssetAssignmentHistory } from "@/lib/assets/assignments";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ASSET_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const asset = await getAsset(context.user.organizationId, id);
  if (!asset) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  if (!isAssetVisibleForScope(asset, scope)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const history = await listAssetAssignmentHistory(context.user.organizationId, id);
  return NextResponse.json({ history });
}
