import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, forbiddenResponseBody, listAccessiblePropertyIds, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { COMPLIANCE_CAPABILITIES } from "@/lib/compliance/constants";
import { createComplianceRecord, listComplianceRecords } from "@/lib/compliance/compliance";
import { createComplianceRecordSchema } from "@/lib/validation/compliance";
import { isPropertyOperational, propertyArchivedResponse } from "@/lib/properties/archive";
import { resolveListPropertyScope } from "@/lib/properties/archive";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(COMPLIANCE_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );

  const { searchParams } = new URL(request.url);
  const activeParam = searchParams.get("active");

  // LIFECYCLE-1: global lists skip archived Properties; record-history
  // requests (a Property tab, an Equipment/Asset panel) keep them.
  const listScope = await resolveListPropertyScope(context.user.organizationId, scope, searchParams);
  const records = await listComplianceRecords(context.user.organizationId, {
    propertyId: searchParams.get("propertyId") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    isActive: activeParam === "true" ? true : activeParam === "false" ? false : undefined,
    propertyIds: listAccessiblePropertyIds(listScope),
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(COMPLIANCE_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createComplianceRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, context.capabilityKeys);
  if (!canAccessProperty(scope, parsed.data.propertyId)) {
    return NextResponse.json(forbiddenResponseBody(), { status: 403 });
  }
  // LIFECYCLE-1: an archived Property is read-only — no new records.
  if (!(await isPropertyOperational(user.organizationId, parsed.data.propertyId))) {
    return propertyArchivedResponse();
  }

  const record = await createComplianceRecord(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "compliance_record.create",
    entityType: "compliance_record",
    entityId: record.id,
    after: record,
  });

  return NextResponse.json({ record }, { status: 201 });
}
