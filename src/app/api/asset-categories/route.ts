import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { ASSET_CAPABILITIES, ASSET_CATEGORY_CAPABILITIES } from "@/lib/assets/constants";
import { createAssetCategory, listAssetCategories } from "@/lib/assets/categories";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { createAssetCategorySchema } from "@/lib/validation/asset-categories";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Categories are reference data needed anywhere an asset is viewed or
  // created, so any of these capabilities is sufficient to read the list.
  const canView =
    context.capabilityKeys.includes(ASSET_CATEGORY_CAPABILITIES.VIEW) ||
    context.capabilityKeys.includes(ASSET_CATEGORY_CAPABILITIES.MANAGE) ||
    context.capabilityKeys.includes(ASSET_CAPABILITIES.VIEW);
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const categories = await listAssetCategories(context.user.organizationId, { activeOnly });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ASSET_CATEGORY_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createAssetCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const category = await createAssetCategory(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "asset_category.create",
    entityType: "asset_category",
    entityId: category.id,
    after: category,
  });

  return NextResponse.json({ category }, { status: 201 });
}
