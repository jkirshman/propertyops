import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { getProperty, updateProperty } from "@/lib/properties/properties";
import { updatePropertySchema } from "@/lib/validation/properties";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const property = await getProperty(context.user.organizationId, id);
  if (!property) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ property });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const existing = await getProperty(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateProperty(user.organizationId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    const changedKeys = Object.keys(diff.after);
    const isActivationOnly = changedKeys.length === 1 && changedKeys[0] === "isActive";
    const action = isActivationOnly
      ? diff.after.isActive
        ? "property.activate"
        : "property.deactivate"
      : "property.update";

    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action,
      entityType: "property",
      entityId: id,
      before: diff.before,
      after: diff.after,
    });
  }

  return NextResponse.json({ property: updated });
}
