import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { EQUIPMENT_TEMPLATE_CAPABILITIES } from "@/lib/equipment/constants";
import {
  createEquipmentTemplateItem,
  getEquipmentTemplate,
  listEquipmentTemplateItems,
} from "@/lib/equipment/templates";
import { createEquipmentTemplateItemSchema } from "@/lib/validation/equipment-templates";

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
  const items = await listEquipmentTemplateItems(context.user.organizationId, id);
  return NextResponse.json({ items });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const template = await getEquipmentTemplate(user.organizationId, id);
  if (!template) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createEquipmentTemplateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let item;
  try {
    item = await createEquipmentTemplateItem(user.organizationId, id, parsed.data);
  } catch {
    return NextResponse.json({ error: "duplicate_catalog_item" }, { status: 409 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "equipment_template.item_add",
    entityType: "equipment_template",
    entityId: id,
    after: { itemId: item.id, equipmentCatalogItemId: item.equipmentCatalogItemId },
  });

  return NextResponse.json({ item }, { status: 201 });
}
