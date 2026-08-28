import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { AssetMoveError, moveAsset } from "@/lib/assets/assignments";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { buildAssetAssignedNotification } from "@/lib/assets/notification-events";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { createNotification } from "@/lib/notifications/notifications";
import { PERSON_CAPABILITIES } from "@/lib/people/constants";
import { getPerson } from "@/lib/people/people";
import { onboardAssetsSchema } from "@/lib/validation/asset-assignments";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { capabilityKeys, user } = context;
  if (
    !capabilityKeys.includes(ASSET_CAPABILITIES.ONBOARDING) ||
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
  const parsed = onboardAssetsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const results: Array<{ assetId: string; ok: boolean; error?: string }> = [];

  for (const assetId of parsed.data.assetIds) {
    try {
      const { asset } = await moveAsset(user.organizationId, assetId, user.id, {
        targetType: "person",
        personId: id,
        notes: parsed.data.notes,
      });

      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "asset.assigned",
        entityType: "asset",
        entityId: assetId,
        after: { assignmentType: "person", personId: id },
      });

      if (person.linkedUserId && person.linkedUserId !== user.id) {
        await createNotification({
          organizationId: user.organizationId,
          recipientUserId: person.linkedUserId,
          actorUserId: user.id,
          ...buildAssetAssignedNotification(asset),
        });
      }

      results.push({ assetId, ok: true });
    } catch (error) {
      const code = error instanceof AssetMoveError ? error.code : "unknown_error";
      results.push({ assetId, ok: false, error: code });
    }
  }

  return NextResponse.json({ results });
}
