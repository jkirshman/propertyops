import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getInspectionCategory } from "@/lib/inspections/categories";
import { INSPECTION_CAPABILITIES, INSPECTION_TEMPLATE_CAPABILITIES } from "@/lib/inspections/constants";
import { createInspectionTemplate, listInspectionTemplates } from "@/lib/inspections/templates";
import { createInspectionTemplateSchema } from "@/lib/validation/inspection-templates";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const templates = await listInspectionTemplates(context.user.organizationId, {
    activeOnly: searchParams.get("activeOnly") === "true",
    categoryId: searchParams.get("categoryId") ?? undefined,
    propertyTypeId: searchParams.get("propertyTypeId") ?? undefined,
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(INSPECTION_TEMPLATE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createInspectionTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;

  const category = await getInspectionCategory(user.organizationId, parsed.data.categoryId);
  if (!category) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  const template = await createInspectionTemplate(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "inspection_template.create",
    entityType: "inspection_template",
    entityId: template.id,
    after: template,
  });

  return NextResponse.json({ template }, { status: 201 });
}
