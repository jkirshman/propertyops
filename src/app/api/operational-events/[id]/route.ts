import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { CALENDAR_CAPABILITIES } from "@/lib/calendar/constants";
import { getOperationalEvent, updateOperationalEvent } from "@/lib/calendar/operational-events";
import { diffFields } from "@/lib/db/diff-fields";
import { getProperty } from "@/lib/properties/properties";
import { updateOperationalEventSchema } from "@/lib/validation/operational-events";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(CALENDAR_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const event = await getOperationalEvent(context.user.organizationId, id);
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(CALENDAR_CAPABILITIES.EDIT_MANUAL_EVENT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const existing = await getOperationalEvent(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateOperationalEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.propertyId) {
    const property = await getProperty(user.organizationId, parsed.data.propertyId);
    if (!property) {
      return NextResponse.json({ error: "invalid_property" }, { status: 400 });
    }
  }

  const updated = await updateOperationalEvent(user.organizationId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, {
    ...parsed.data,
    startAt: parsed.data.startAt !== undefined ? new Date(parsed.data.startAt) : undefined,
    endAt:
      parsed.data.endAt !== undefined ? (parsed.data.endAt ? new Date(parsed.data.endAt) : null) : undefined,
  });
  if (diff) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action:
        parsed.data.status === "cancelled" ? "operational_event.cancelled" : "operational_event.updated",
      entityType: "operational_event",
      entityId: id,
      before: diff.before,
      after: diff.after,
    });
  }

  return NextResponse.json({ event: updated });
}
