import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { INSPECTION_TEMPLATE_CAPABILITIES } from "@/lib/inspections/constants";
import {
  deleteInspectionTemplateItem,
  getInspectionTemplateItem,
  updateInspectionTemplateItem,
} from "@/lib/inspections/templates";
import { updateInspectionTemplateItemSchema } from "@/lib/validation/inspection-template-items";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(INSPECTION_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, itemId } = await params;
  const { user } = context;

  const existing = await getInspectionTemplateItem(user.organizationId, id, itemId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateInspectionTemplateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateInspectionTemplateItem(user.organizationId, id, itemId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "inspection_template.item_update",
      entityType: "inspection_template",
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

  if (!context.capabilityKeys.includes(INSPECTION_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, itemId } = await params;
  const { user } = context;

  const deleted = await deleteInspectionTemplateItem(user.organizationId, id, itemId);
  if (!deleted) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "inspection_template.item_remove",
    entityType: "inspection_template",
    entityId: id,
    before: { itemId, label: deleted.label },
  });

  return NextResponse.json({ ok: true });
}
