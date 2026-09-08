import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { VENDOR_CAPABILITIES, VENDOR_CATEGORY_CAPABILITIES } from "@/lib/vendors/constants";
import { createVendorCategory, listVendorCategories } from "@/lib/vendors/categories";
import { createVendorCategorySchema } from "@/lib/validation/vendor-categories";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Vendor categories are reference data needed anywhere a vendor is viewed or
  // created, so either capability is sufficient to read the list.
  const canView =
    context.capabilityKeys.includes(VENDOR_CATEGORY_CAPABILITIES.VIEW) ||
    context.capabilityKeys.includes(VENDOR_CAPABILITIES.VIEW);
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const categories = await listVendorCategories(context.user.organizationId, { activeOnly });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(VENDOR_CATEGORY_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createVendorCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const category = await createVendorCategory(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "vendor_category.create",
    entityType: "vendor_category",
    entityId: category.id,
    after: category,
  });

  return NextResponse.json({ category }, { status: 201 });
}
