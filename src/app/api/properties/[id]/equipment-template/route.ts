import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { setPropertyEquipmentTemplateSelection } from "@/lib/equipment/template-resolution";
import { getEquipmentTemplate } from "@/lib/equipment/templates";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { getProperty } from "@/lib/properties/properties";
import { propertyEquipmentTemplateSelectionSchema } from "@/lib/validation/equipment-templates";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const existing = await getProperty(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = propertyEquipmentTemplateSelectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.mode === "override") {
    const template = await getEquipmentTemplate(user.organizationId, parsed.data.templateId!);
    if (!template) {
      return NextResponse.json({ error: "invalid_template" }, { status: 400 });
    }
  }

  const updated = await setPropertyEquipmentTemplateSelection(user.organizationId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property.equipment_template_changed",
    entityType: "property",
    entityId: id,
    before: {
      equipmentTemplateMode: existing.equipmentTemplateMode,
      equipmentTemplateId: existing.equipmentTemplateId,
    },
    after: {
      equipmentTemplateMode: updated.equipmentTemplateMode,
      equipmentTemplateId: updated.equipmentTemplateId,
    },
  });

  return NextResponse.json({ property: updated });
}
