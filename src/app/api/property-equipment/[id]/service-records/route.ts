import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { getPropertyEquipment } from "@/lib/equipment/property-equipment";
import {
  createEquipmentServiceRecord,
  listEquipmentServiceRecords,
} from "@/lib/equipment/service-records";
import { createEquipmentServiceRecordSchema } from "@/lib/validation/equipment-service-records";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const records = await listEquipmentServiceRecords(context.user.organizationId, id);
  return NextResponse.json({ serviceRecords: records });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.MANAGE_SERVICE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const equipment = await getPropertyEquipment(user.organizationId, id);
  if (!equipment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createEquipmentServiceRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const record = await createEquipmentServiceRecord(user.organizationId, id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property_equipment.service_record_create",
    entityType: "property_equipment",
    entityId: id,
    after: { serviceRecordId: record.id, serviceType: record.serviceType, serviceDate: record.serviceDate },
  });

  return NextResponse.json({ serviceRecord: record }, { status: 201 });
}
