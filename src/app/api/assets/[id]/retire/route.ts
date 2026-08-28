import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getAsset, updateAsset } from "@/lib/assets/assets";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { retireAssetSchema } from "@/lib/validation/assets";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ASSET_CAPABILITIES.RETIRE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const existing = await getAsset(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = retireAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const isTerminal = parsed.data.status === "retired" || parsed.data.status === "disposed";

  const updated = await updateAsset(user.organizationId, id, {
    status: parsed.data.status,
    retiredDate: parsed.data.retiredDate ?? new Date().toISOString().slice(0, 10),
    disposalReason: parsed.data.disposalReason,
    isActive: isTerminal ? false : existing.isActive,
  });
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: parsed.data.status === "disposed" ? "asset.disposed" : "asset.retired",
    entityType: "asset",
    entityId: id,
    before: { status: existing.status },
    after: { status: updated.status },
  });

  return NextResponse.json({ asset: updated });
}
