import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { TENANT_CAPABILITIES } from "@/lib/tenants/constants";
import { createTenant, listTenants } from "@/lib/tenants/tenants";
import { createTenantSchema } from "@/lib/validation/tenants";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(TENANT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeParam = searchParams.get("active");

  const tenants = await listTenants(context.user.organizationId, {
    search: searchParams.get("search") ?? undefined,
    tenantType: searchParams.get("tenantType") ?? undefined,
    isActive: activeParam === "true" ? true : activeParam === "false" ? false : undefined,
    propertyId: searchParams.get("propertyId") ?? undefined,
  });

  return NextResponse.json({ tenants });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(TENANT_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const tenant = await createTenant(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "tenant.create",
    entityType: "tenant",
    entityId: tenant.id,
    after: tenant,
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
