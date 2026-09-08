import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { createVendor, listVendors } from "@/lib/vendors/vendors";
import { createVendorSchema } from "@/lib/validation/vendors";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeParam = searchParams.get("active");
  const preferredParam = searchParams.get("preferred");

  const vendors = await listVendors(context.user.organizationId, {
    search: searchParams.get("search") ?? undefined,
    isActive: activeParam === "true" ? true : activeParam === "false" ? false : undefined,
    isPreferred: preferredParam === "true" ? true : preferredParam === "false" ? false : undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    propertyId: searchParams.get("propertyId") ?? undefined,
  });

  return NextResponse.json({ vendors });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createVendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const vendor = await createVendor(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "vendor.create",
    entityType: "vendor",
    entityId: vendor.id,
    after: vendor,
  });

  return NextResponse.json({ vendor }, { status: 201 });
}
