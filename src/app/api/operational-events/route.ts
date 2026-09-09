import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { CALENDAR_CAPABILITIES } from "@/lib/calendar/constants";
import { createOperationalEvent, listOperationalEvents } from "@/lib/calendar/operational-events";
import { getProperty } from "@/lib/properties/properties";
import { createOperationalEventSchema } from "@/lib/validation/operational-events";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(CALENDAR_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const events = await listOperationalEvents(context.user.organizationId, {
    propertyId: searchParams.get("propertyId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(CALENDAR_CAPABILITIES.CREATE_MANUAL_EVENT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOperationalEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;

  if (parsed.data.propertyId) {
    const property = await getProperty(user.organizationId, parsed.data.propertyId);
    if (!property) {
      return NextResponse.json({ error: "invalid_property" }, { status: 400 });
    }
  }

  const event = await createOperationalEvent(user.organizationId, user.id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "operational_event.created",
    entityType: "operational_event",
    entityId: event.id,
    after: event,
  });

  return NextResponse.json({ event }, { status: 201 });
}
