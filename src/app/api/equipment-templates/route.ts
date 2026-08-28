import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { EQUIPMENT_TEMPLATE_CAPABILITIES } from "@/lib/equipment/constants";
import { createEquipmentTemplate, listEquipmentTemplates } from "@/lib/equipment/templates";
import { createEquipmentTemplateSchema } from "@/lib/validation/equipment-templates";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const templates = await listEquipmentTemplates(context.user.organizationId, { activeOnly });
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createEquipmentTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const template = await createEquipmentTemplate(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "equipment_template.create",
    entityType: "equipment_template",
    entityId: template.id,
    after: template,
  });

  return NextResponse.json({ template }, { status: 201 });
}
