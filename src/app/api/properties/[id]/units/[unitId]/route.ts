import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { PROPERTY_UNIT_CAPABILITIES } from "@/lib/property-units/constants";
import { getPropertyUnit, updatePropertyUnit } from "@/lib/property-units/property-units";
import { updatePropertyUnitSchema } from "@/lib/validation/property-units";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_UNIT_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, unitId } = await params;
  const { user } = context;

  const existing = await getPropertyUnit(user.organizationId, id, unitId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePropertyUnitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updatePropertyUnit(user.organizationId, id, unitId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "property_unit.update",
      entityType: "property_unit",
      entityId: unitId,
      before: diff.before,
      after: diff.after,
    });
  }

  return NextResponse.json({ unit: updated });
}
