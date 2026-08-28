import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { EQUIPMENT_TEMPLATE_CAPABILITIES } from "@/lib/equipment/constants";
import {
  deleteEquipmentTemplateItem,
  getEquipmentTemplateItem,
  updateEquipmentTemplateItem,
} from "@/lib/equipment/templates";
import { updateEquipmentTemplateItemSchema } from "@/lib/validation/equipment-templates";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, itemId } = await params;
  const { user } = context;

  const existing = await getEquipmentTemplateItem(user.organizationId, id, itemId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateEquipmentTemplateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateEquipmentTemplateItem(user.organizationId, id, itemId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "equipment_template.item_update",
      entityType: "equipment_template",
      entityId: id,
      before: { itemId, ...diff.before },
      after: { itemId, ...diff.after },
    });
  }

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, itemId } = await params;
  const { user } = context;

  const deleted = await deleteEquipmentTemplateItem(user.organizationId, id, itemId);
  if (!deleted) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "equipment_template.item_remove",
    entityType: "equipment_template",
    entityId: id,
    before: { itemId, equipmentCatalogItemId: deleted.equipmentCatalogItemId },
  });

  return NextResponse.json({ ok: true });
}
