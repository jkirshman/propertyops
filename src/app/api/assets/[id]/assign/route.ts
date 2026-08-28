import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { AssetMoveError, moveAsset } from "@/lib/assets/assignments";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { buildAssetAssignedNotification } from "@/lib/assets/notification-events";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { createNotification } from "@/lib/notifications/notifications";
import { getPerson } from "@/lib/people/people";
import { moveAssetSchema } from "@/lib/validation/asset-assignments";

const ERROR_STATUS: Record<AssetMoveError["code"], number> = {
  not_found: 404,
  asset_retired: 409,
  invalid_target: 400,
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(ASSET_CAPABILITIES.ASSIGN)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const body = await request.json().catch(() => null);
  const parsed = moveAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await moveAsset(user.organizationId, id, user.id, parsed.data);
  } catch (error) {
    if (error instanceof AssetMoveError) {
      return NextResponse.json({ error: error.code }, { status: ERROR_STATUS[error.code] });
    }
    throw error;
  }

  const actionByTarget: Record<string, string> = {
    person: "asset.assigned",
    property: "asset.assigned",
    unassigned: "asset.returned",
  };

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: actionByTarget[parsed.data.targetType],
    entityType: "asset",
    entityId: id,
    after: {
      assignmentType: parsed.data.targetType,
      personId: parsed.data.personId ?? null,
      propertyId: parsed.data.propertyId ?? null,
    },
  });

  if (parsed.data.targetType === "person") {
    const person = await getPerson(user.organizationId, parsed.data.personId!);
    if (person?.linkedUserId && person.linkedUserId !== user.id) {
      await createNotification({
        organizationId: user.organizationId,
        recipientUserId: person.linkedUserId,
        actorUserId: user.id,
        ...buildAssetAssignedNotification(result.asset),
      });
    }
  }

  return NextResponse.json({ asset: result.asset });
}
