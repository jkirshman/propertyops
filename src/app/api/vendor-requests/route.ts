import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import {
  canAccessProperty,
  listAccessiblePropertyIds,
  listUserIdsWithCapabilityForProperty,
  resolveUserPropertyScope,
} from "@/lib/auth/property-access";
import { createNotification } from "@/lib/notifications/notifications";
import { getProperty } from "@/lib/properties/properties";
import { submitVendorSchema } from "@/lib/validation/vendors";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import {
  createVendorSubmission,
  findVendorByExactName,
  listPendingVendorSubmissions,
} from "@/lib/vendors/vendors";
import { buildVendorSubmittedNotification } from "@/lib/vendors/notification-events";

export async function GET() {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.APPROVE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  const propertyIds = listAccessiblePropertyIds(scope);
  const vendors = await listPendingVendorSubmissions(context.user.organizationId, propertyIds);

  return NextResponse.json({ vendors });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (
    !context.capabilityKeys.includes(VENDOR_CAPABILITIES.SUBMIT) &&
    !context.capabilityKeys.includes(VENDOR_CAPABILITIES.CREATE)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = submitVendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, context.capabilityKeys);
  if (!canAccessProperty(scope, parsed.data.propertyId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const property = await getProperty(user.organizationId, parsed.data.propertyId);
  if (!property) {
    return NextResponse.json({ error: "invalid_property" }, { status: 400 });
  }

  const duplicate = await findVendorByExactName(user.organizationId, parsed.data.name);
  if (duplicate) {
    return NextResponse.json({ error: "duplicate_vendor" }, { status: 400 });
  }

  const vendor = await createVendorSubmission(user.organizationId, user.id, parsed.data.propertyId, {
    name: parsed.data.name,
    primaryPhone: parsed.data.primaryPhone,
    primaryEmail: parsed.data.primaryEmail,
    notes: parsed.data.notes,
    categoryIds: parsed.data.categoryIds,
  });

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "vendor.submitted",
    entityType: "vendor",
    entityId: vendor.id,
    after: vendor,
  });

  const recipientIds = await listUserIdsWithCapabilityForProperty(
    user.organizationId,
    parsed.data.propertyId,
    VENDOR_CAPABILITIES.APPROVE,
  );
  const notification = buildVendorSubmittedNotification(vendor, user.displayName);
  for (const recipientId of recipientIds) {
    if (recipientId === user.id) continue;
    await createNotification({
      organizationId: user.organizationId,
      recipientUserId: recipientId,
      actorUserId: user.id,
      ...notification,
    });
  }

  return NextResponse.json({ vendor }, { status: 201 });
}
