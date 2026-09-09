import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { getLeaseDateOrderingIssues } from "@/lib/leases/date-ordering";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { getLease, updateLease } from "@/lib/leases/leases";
import { getPropertyUnit } from "@/lib/property-units/property-units";
import { updateLeaseSchema } from "@/lib/validation/leases";

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key))) as Partial<T>;
}

const DATE_FIELDS = ["startDate", "endDate", "moveInDate", "moveOutDate", "noticeDate", "renewalOptionDate"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(LEASE_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const lease = await getLease(context.user.organizationId, id);
  if (!lease) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ lease });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const existing = await getLease(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateLeaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const fields = parsed.data;

  if (fields.status !== undefined && !capabilityKeys.includes(LEASE_CAPABILITIES.MANAGE_STATUS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const otherFieldsTouched = Object.keys(fields).some((key) => key !== "status");
  if (otherFieldsTouched && !capabilityKeys.includes(LEASE_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Cross-field date ordering checked against the *merged* (existing + incoming)
  // dates, since a PATCH touching only one side of a pair can't validate it
  // from the request body alone.
  const mergedDates = {
    startDate: fields.startDate ?? existing.startDate,
    endDate: fields.endDate === null ? null : (fields.endDate ?? existing.endDate),
    moveInDate: fields.moveInDate === null ? null : (fields.moveInDate ?? existing.moveInDate),
    moveOutDate: fields.moveOutDate === null ? null : (fields.moveOutDate ?? existing.moveOutDate),
  };
  if (fields.propertyUnitId) {
    const unit = await getPropertyUnit(user.organizationId, existing.propertyId, fields.propertyUnitId);
    if (!unit || !unit.isActive) {
      return NextResponse.json({ error: "invalid_unit" }, { status: 400 });
    }
  }

  const dateIssues = getLeaseDateOrderingIssues(mergedDates);
  if (dateIssues.length > 0) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of dateIssues) {
      fieldErrors[issue.field] = [issue.message];
    }
    return NextResponse.json(
      { error: "invalid_input", details: { formErrors: [], fieldErrors } },
      { status: 400 },
    );
  }

  const updated = await updateLease(user.organizationId, id, fields);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, fields);
  if (diff) {
    const changedKeys = Object.keys(diff.after);

    if (changedKeys.includes("status")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.status === "terminated" ? "lease.terminated" : "lease.status_changed",
        entityType: "lease",
        entityId: id,
        before: pick(diff.before, ["status"]),
        after: pick(diff.after, ["status"]),
      });
    }

    const changedDateKeys = changedKeys.filter((key) => DATE_FIELDS.includes(key));
    if (changedDateKeys.length > 0) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "lease.dates_changed",
        entityType: "lease",
        entityId: id,
        before: pick(diff.before, changedDateKeys),
        after: pick(diff.after, changedDateKeys),
      });
    }

    const remainingKeys = changedKeys.filter((key) => key !== "status" && !DATE_FIELDS.includes(key));
    if (remainingKeys.length > 0) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "lease.update",
        entityType: "lease",
        entityId: id,
        before: pick(diff.before, remainingKeys),
        after: pick(diff.after, remainingKeys),
      });
    }
  }

  return NextResponse.json({ lease: updated });
}
