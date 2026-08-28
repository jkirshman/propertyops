import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { EQUIPMENT_TEMPLATE_CAPABILITIES } from "@/lib/equipment/constants";
import { getEquipmentTemplate, updateEquipmentTemplate } from "@/lib/equipment/templates";
import { updateEquipmentTemplateSchema } from "@/lib/validation/equipment-templates";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const canView =
    context.capabilityKeys.includes(EQUIPMENT_TEMPLATE_CAPABILITIES.VIEW) ||
    context.capabilityKeys.includes(EQUIPMENT_TEMPLATE_CAPABILITIES.MANAGE);
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const template = await getEquipmentTemplate(context.user.organizationId, id);
  if (!template) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const existing = await getEquipmentTemplate(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateEquipmentTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateEquipmentTemplate(user.organizationId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "equipment_template.update",
      entityType: "equipment_template",
      entityId: id,
      before: diff.before,
      after: diff.after,
    });
  }

  return NextResponse.json({ template: updated });
}
