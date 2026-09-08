import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { createLease, listLeases } from "@/lib/leases/leases";
import { getProperty } from "@/lib/properties/properties";
import { getTenant } from "@/lib/tenants/tenants";
import { createLeaseSchema } from "@/lib/validation/leases";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(LEASE_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const leases = await listLeases(context.user.organizationId, {
    propertyId: searchParams.get("propertyId") ?? undefined,
    tenantId: searchParams.get("tenantId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ leases });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(LEASE_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createLeaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;

  const [property, tenant] = await Promise.all([
    getProperty(user.organizationId, parsed.data.propertyId),
    getTenant(user.organizationId, parsed.data.tenantId),
  ]);
  if (!property) {
    return NextResponse.json({ error: "invalid_property" }, { status: 400 });
  }
  if (!tenant) {
    return NextResponse.json({ error: "invalid_tenant" }, { status: 400 });
  }

  const lease = await createLease(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "lease.create",
    entityType: "lease",
    entityId: lease.id,
    after: lease,
  });

  return NextResponse.json({ lease }, { status: 201 });
}
