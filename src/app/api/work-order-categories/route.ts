import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import {
  WORK_ORDER_CAPABILITIES,
  WORK_ORDER_CATEGORY_CAPABILITIES,
} from "@/lib/work-orders/constants";
import { createWorkOrderCategory, listWorkOrderCategories } from "@/lib/work-orders/categories";
import { createWorkOrderCategorySchema } from "@/lib/validation/work-order-categories";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Categories are reference data needed anywhere a work order is viewed or
  // created, so either capability is sufficient to read the list.
  const canView =
    context.capabilityKeys.includes(WORK_ORDER_CATEGORY_CAPABILITIES.VIEW) ||
    context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.VIEW);
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const categories = await listWorkOrderCategories(context.user.organizationId, { activeOnly });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(WORK_ORDER_CATEGORY_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkOrderCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const category = await createWorkOrderCategory(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "work_order_category.create",
    entityType: "work_order_category",
    entityId: category.id,
    after: category,
  });

  return NextResponse.json({ category }, { status: 201 });
}
