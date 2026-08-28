import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { listPropertyEquipmentActivity } from "@/lib/equipment/activity";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const activity = await listPropertyEquipmentActivity(context.user.organizationId, id);
  return NextResponse.json({ activity });
}
