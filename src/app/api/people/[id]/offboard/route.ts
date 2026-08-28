import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getAsset } from "@/lib/assets/assets";
import { AssetMoveError, moveAsset } from "@/lib/assets/assignments";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { PERSON_CAPABILITIES } from "@/lib/people/constants";
import { getPerson } from "@/lib/people/people";
import { offboardAssetsSchema } from "@/lib/validation/asset-assignments";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { capabilityKeys, user } = context;
  if (
    !capabilityKeys.includes(ASSET_CAPABILITIES.OFFBOARDING) ||
    !capabilityKeys.includes(ASSET_CAPABILITIES.ASSIGN)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!capabilityKeys.includes(PERSON_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const person = await getPerson(user.organizationId, id);
  if (!person) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = offboardAssetsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const results: Array<{ assetId: string; ok: boolean; error?: string }> = [];

  for (const action of parsed.data.actions) {
    const current = await getAsset(user.organizationId, action.assetId);
    if (!current || current.assignedPersonId !== id) {
      results.push({ assetId: action.assetId, ok: false, error: "not_assigned_to_person" });
      continue;
    }

    try {
      await moveAsset(user.organizationId, action.assetId, user.id, {
        targetType: action.targetType,
        propertyId: action.targetType === "property" ? action.propertyId : undefined,
        notes: parsed.data.notes,
      });

      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "asset.returned",
        entityType: "asset",
        entityId: action.assetId,
        before: { assignmentType: "person", personId: id },
        after: {
          assignmentType: action.targetType,
          propertyId: action.targetType === "property" ? action.propertyId : null,
        },
      });

      results.push({ assetId: action.assetId, ok: true });
    } catch (error) {
      const code = error instanceof AssetMoveError ? error.code : "unknown_error";
      results.push({ assetId: action.assetId, ok: false, error: code });
    }
  }

  return NextResponse.json({ results });
}
