import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { getInspectionCategory } from "@/lib/inspections/categories";
import { INSPECTION_CAPABILITIES, INSPECTION_TEMPLATE_CAPABILITIES } from "@/lib/inspections/constants";
import { getInspectionTemplate, updateInspectionTemplate } from "@/lib/inspections/templates";
import { updateInspectionTemplateSchema } from "@/lib/validation/inspection-templates";

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key))) as Partial<T>;
}

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
  const template = await getInspectionTemplate(context.user.organizationId, id);
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

  if (!context.capabilityKeys.includes(INSPECTION_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const existing = await getInspectionTemplate(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateInspectionTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.categoryId) {
    const category = await getInspectionCategory(user.organizationId, parsed.data.categoryId);
    if (!category) {
      return NextResponse.json({ error: "invalid_category" }, { status: 400 });
    }
  }

  const updated = await updateInspectionTemplate(user.organizationId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    const changedKeys = Object.keys(diff.after);

    if (changedKeys.includes("isActive")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.isActive ? "inspection_template.activated" : "inspection_template.deactivated",
        entityType: "inspection_template",
        entityId: id,
        before: pick(diff.before, ["isActive"]),
        after: pick(diff.after, ["isActive"]),
      });
    }

    const remainingKeys = changedKeys.filter((key) => key !== "isActive");
    if (remainingKeys.length > 0) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "inspection_template.update",
        entityType: "inspection_template",
        entityId: id,
        before: pick(diff.before, remainingKeys),
        after: pick(diff.after, remainingKeys),
      });
    }
  }

  return NextResponse.json({ template: updated });
}
