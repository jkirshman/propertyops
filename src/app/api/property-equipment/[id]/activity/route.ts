import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { listPropertyEquipmentActivity } from "@/lib/equipment/activity";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const equipment = await getPropertyEquipment(user.organizationId, id);
  if (!equipment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, equipment.propertyId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const activity = await listPropertyEquipmentActivity(context.user.organizationId, id);
  return NextResponse.json({ activity });
}
