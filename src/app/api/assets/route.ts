import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { createAsset, listAssets } from "@/lib/assets/assets";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { createAssetSchema } from "@/lib/validation/assets";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ASSET_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeParam = searchParams.get("active");

  const assets = await listAssets(context.user.organizationId, {
    search: searchParams.get("search") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    condition: searchParams.get("condition") ?? undefined,
    assignmentType: searchParams.get("assignmentType") ?? undefined,
    propertyId: searchParams.get("propertyId") ?? undefined,
    personId: searchParams.get("personId") ?? undefined,
    isActive: activeParam ? activeParam === "true" : undefined,
  });
  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ASSET_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const asset = await createAsset(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "asset.create",
    entityType: "asset",
    entityId: asset.id,
    after: asset,
  });

  return NextResponse.json({ asset }, { status: 201 });
}
