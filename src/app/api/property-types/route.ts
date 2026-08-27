import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { createPropertyType, listPropertyTypes } from "@/lib/properties/property-types";
import { PROPERTY_CAPABILITIES, PROPERTY_TYPE_CAPABILITIES } from "@/lib/properties/constants";
import { createPropertyTypeSchema } from "@/lib/validation/property-types";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Property types are reference data needed anywhere a property is viewed or
  // created, so either capability is sufficient to read the list.
  const canView =
    context.capabilityKeys.includes(PROPERTY_TYPE_CAPABILITIES.VIEW) ||
    context.capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW);
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const types = await listPropertyTypes(context.user.organizationId, { activeOnly });
  return NextResponse.json({ propertyTypes: types });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_TYPE_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPropertyTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const propertyType = await createPropertyType(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property_type.create",
    entityType: "property_type",
    entityId: propertyType.id,
    after: propertyType,
  });

  return NextResponse.json({ propertyType }, { status: 201 });
}
