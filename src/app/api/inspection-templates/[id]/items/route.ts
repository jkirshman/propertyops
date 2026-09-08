import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { INSPECTION_CAPABILITIES, INSPECTION_TEMPLATE_CAPABILITIES } from "@/lib/inspections/constants";
import {
  createInspectionTemplateItem,
  getInspectionTemplate,
  listInspectionTemplateItems,
} from "@/lib/inspections/templates";
import { createInspectionTemplateItemSchema } from "@/lib/validation/inspection-template-items";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const canView =
    context.capabilityKeys.includes(INSPECTION_TEMPLATE_CAPABILITIES.VIEW) ||
    context.capabilityKeys.includes(INSPECTION_TEMPLATE_CAPABILITIES.MANAGE) ||
    context.capabilityKeys.includes(INSPECTION_CAPABILITIES.VIEW) ||
    context.capabilityKeys.includes(INSPECTION_CAPABILITIES.CREATE);
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const items = await listInspectionTemplateItems(context.user.organizationId, id);
  return NextResponse.json({ items });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(INSPECTION_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const template = await getInspectionTemplate(user.organizationId, id);
  if (!template) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createInspectionTemplateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const item = await createInspectionTemplateItem(user.organizationId, id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "inspection_template.item_add",
    entityType: "inspection_template",
    entityId: id,
    after: { itemId: item.id, label: item.label, responseType: item.responseType },
  });

  return NextResponse.json({ item }, { status: 201 });
}
