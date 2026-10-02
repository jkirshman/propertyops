import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { getProperty } from "@/lib/properties/properties";

import { getArchiveImpactCounts, setPropertyActive } from "./archive";
import { canArchiveProperty, describeArchiveImpact, planArchiveTransition, type ArchiveTransition } from "./archive-rules";

/**
 * LIFECYCLE-1: shared by POST /api/properties/[id]/archive and /restore.
 * Same gates as editing a Property (property.edit + access to it); flips
 * only properties.is_active and audits property.archived / property.restored
 * with the related-record counts at that moment.
 */
export async function handlePropertyArchiveTransition(propertyId: string, transition: ArchiveTransition) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!canArchiveProperty(context.capabilityKeys)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { user } = context;
  const existing = await getProperty(user.organizationId, propertyId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, context.capabilityKeys);
  if (!canAccessProperty(scope, existing.id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const plan = planArchiveTransition(existing, transition);
  if (!plan.ok) {
    return NextResponse.json({ error: plan.error }, { status: 409 });
  }

  const counts = await getArchiveImpactCounts(user.organizationId, existing.id);
  const updated = await setPropertyActive(user.organizationId, existing.id, plan.isActive);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: plan.auditAction,
    entityType: "property",
    entityId: existing.id,
    before: { isActive: existing.isActive },
    after: { isActive: updated.isActive, relatedRecords: counts },
  });

  return NextResponse.json({ property: updated });
}

/** GET /api/properties/[id]/archive — what is still active, for the confirmation. */
export async function handlePropertyArchivePreview(propertyId: string) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!canArchiveProperty(context.capabilityKeys)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { user } = context;
  const existing = await getProperty(user.organizationId, propertyId);
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, context.capabilityKeys);
  if (!existing || !canAccessProperty(scope, existing.id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const counts = await getArchiveImpactCounts(user.organizationId, existing.id);
  return NextResponse.json({ counts, lines: describeArchiveImpact(counts) });
}
