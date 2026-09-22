import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { filterAccessibleEquipment } from "@/lib/equipment/equipment-access";
import { listEquipmentServiceRecordsByVendor } from "@/lib/equipment/service-records";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;
  // UNIT-EQUIP-1: service records inherit their Equipment's visibility — this
  // also limits the list to Properties the caller can access at all.
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  const rows = await listEquipmentServiceRecordsByVendor(user.organizationId, id);
  const serviceRecords = filterAccessibleEquipment(scope, rows);
  return NextResponse.json({ serviceRecords });
}
