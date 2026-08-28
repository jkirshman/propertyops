import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import {
  getEquipmentServiceRecord,
  updateEquipmentServiceRecord,
} from "@/lib/equipment/service-records";
import { updateEquipmentServiceRecordSchema } from "@/lib/validation/equipment-service-records";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.MANAGE_SERVICE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, recordId } = await params;
  const { user } = context;

  const existing = await getEquipmentServiceRecord(user.organizationId, id, recordId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateEquipmentServiceRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateEquipmentServiceRecord(user.organizationId, id, recordId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "property_equipment.service_record_update",
      entityType: "property_equipment",
      entityId: id,
      before: { serviceRecordId: recordId, ...diff.before },
      after: { serviceRecordId: recordId, ...diff.after },
    });
  }

  return NextResponse.json({ serviceRecord: updated });
}
