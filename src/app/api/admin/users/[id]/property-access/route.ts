import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getProperty } from "@/lib/properties/properties";
import { getPropertyUnit } from "@/lib/property-units/property-units";
import { getUser } from "@/lib/users/users";
import {
  addUserPropertyAccess,
  findUserPropertyAccess,
  listUserPropertyAccess,
} from "@/lib/users/user-property-access";
import { assignUserPropertyAccessSchema } from "@/lib/validation/user-property-access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const targetUser = await getUser(context.user.organizationId, id);
  if (!targetUser) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const access = await listUserPropertyAccess(context.user.organizationId, id);
  return NextResponse.json({ access });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(ADMIN_CAPABILITIES.USERS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user: actor } = context;

  const targetUser = await getUser(actor.organizationId, id);
  if (!targetUser) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = assignUserPropertyAccessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const property = await getProperty(actor.organizationId, parsed.data.propertyId);
  if (!property) {
    return NextResponse.json({ error: "invalid_property" }, { status: 400 });
  }

  const propertyUnitId = parsed.data.propertyUnitId ?? null;
  if (propertyUnitId) {
    const unit = await getPropertyUnit(actor.organizationId, property.id, propertyUnitId);
    if (!unit) {
      return NextResponse.json({ error: "invalid_unit" }, { status: 400 });
    }
  }

  const existing = await findUserPropertyAccess(actor.organizationId, id, property.id, propertyUnitId);
  if (existing) {
    return NextResponse.json({ error: "already_assigned" }, { status: 409 });
  }

  const row = await addUserPropertyAccess({
    organizationId: actor.organizationId,
    userId: id,
    propertyId: property.id,
    propertyUnitId,
    createdByUserId: actor.id,
  });

  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "user_property_access.assigned",
    entityType: "user_property_access",
    entityId: row.id,
    after: row,
  });

  const access = await listUserPropertyAccess(actor.organizationId, id);
  return NextResponse.json({ access }, { status: 201 });
}
