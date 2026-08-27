import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { createProperty, listProperties } from "@/lib/properties/properties";
import { createPropertySchema } from "@/lib/validation/properties";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const propertyTypeId = searchParams.get("propertyTypeId") ?? undefined;
  const activeParam = searchParams.get("active");
  const isActive = activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const results = await listProperties(context.user.organizationId, {
    search,
    propertyTypeId,
    isActive,
  });

  return NextResponse.json({ properties: results });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const property = await createProperty(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "property.create",
    entityType: "property",
    entityId: property.id,
    after: property,
  });

  return NextResponse.json({ property }, { status: 201 });
}
