import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getProperty } from "@/lib/properties/properties";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { removeVendorCoverage } from "@/lib/vendors/coverage";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; propertyId: string }> },
) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.MANAGE_COVERAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, propertyId } = await params;
  const { user } = context;

  const property = await getProperty(user.organizationId, propertyId);

  await removeVendorCoverage(user.organizationId, id, propertyId);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "vendor.coverage_remove",
    entityType: "vendor",
    entityId: id,
    before: { propertyId, propertyName: property?.name },
  });

  return NextResponse.json({ ok: true });
}
