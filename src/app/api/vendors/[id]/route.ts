import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { getVendorWithCategories, updateVendor } from "@/lib/vendors/vendors";
import { updateVendorSchema } from "@/lib/validation/vendors";

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key))) as Partial<T>;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const vendor = await getVendorWithCategories(context.user.organizationId, id);
  if (!vendor) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ vendor });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user } = context;

  const existing = await getVendorWithCategories(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateVendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateVendor(user.organizationId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    const changedKeys = Object.keys(diff.after);

    if (changedKeys.includes("isActive")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: updated.isActive ? "vendor.activated" : "vendor.deactivated",
        entityType: "vendor",
        entityId: id,
        before: pick(diff.before, ["isActive"]),
        after: pick(diff.after, ["isActive"]),
      });
    }

    if (changedKeys.includes("isPreferred")) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "vendor.preferred_changed",
        entityType: "vendor",
        entityId: id,
        before: pick(diff.before, ["isPreferred"]),
        after: pick(diff.after, ["isPreferred"]),
      });
    }

    const remainingKeys = changedKeys.filter((key) => !["isActive", "isPreferred"].includes(key));
    if (remainingKeys.length > 0) {
      await recordAuditEvent({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "vendor.update",
        entityType: "vendor",
        entityId: id,
        before: pick(diff.before, remainingKeys),
        after: pick(diff.after, remainingKeys),
      });
    }
  }

  if (parsed.data.categoryIds !== undefined) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "vendor.categories_updated",
      entityType: "vendor",
      entityId: id,
      before: { categories: existing.categories.map((category) => category.id) },
      after: { categories: parsed.data.categoryIds },
    });
  }

  const vendor = await getVendorWithCategories(user.organizationId, id);
  return NextResponse.json({ vendor });
}
