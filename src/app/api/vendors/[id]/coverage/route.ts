import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getProperty } from "@/lib/properties/properties";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { addVendorCoverage, listVendorCoverage } from "@/lib/vendors/coverage";
import { getVendor } from "@/lib/vendors/vendors";

const addCoverageSchema = z.object({ propertyId: z.string().uuid() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const coverage = await listVendorCoverage(context.user.organizationId, id);
  return NextResponse.json({ coverage });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.MANAGE_COVERAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const vendor = await getVendor(user.organizationId, id);
  if (!vendor) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addCoverageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const property = await getProperty(user.organizationId, parsed.data.propertyId);
  if (!property) {
    return NextResponse.json({ error: "invalid_property" }, { status: 400 });
  }

  const row = await addVendorCoverage(user.organizationId, id, parsed.data.propertyId);

  if (row) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "vendor.coverage_add",
      entityType: "vendor",
      entityId: id,
      after: { propertyId: property.id, propertyName: property.name },
    });
  }

  return NextResponse.json({ coverage: { id: row?.id, propertyId: property.id, propertyName: property.name } }, { status: 201 });
}
