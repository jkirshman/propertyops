import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { diffFields } from "@/lib/db/diff-fields";
import {
  getExternalDocumentLink,
  updateExternalDocumentLink,
} from "@/lib/external-documents/external-documents";
import { sanitizeUrlForAudit } from "@/lib/external-documents/url-validation";
import { getRelatedEntityFileRules } from "@/lib/files/related-entity-rules";
import { updateExternalDocumentLinkSchema } from "@/lib/validation/external-documents";

function sanitizedForAudit(row: { externalUrl?: string }) {
  return row.externalUrl !== undefined
    ? { ...row, externalUrl: sanitizeUrlForAudit(row.externalUrl) }
    : row;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { user, capabilityKeys } = context;
  const { id } = await params;

  const existing = await getExternalDocumentLink(user.organizationId, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rules = getRelatedEntityFileRules(existing.relatedEntityType);
  if (rules && !capabilityKeys.includes(rules.manageCapability)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateExternalDocumentLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateExternalDocumentLink(user.organizationId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const diff = diffFields(existing, parsed.data);
  if (diff) {
    const wasArchived = existing.isActive && parsed.data.isActive === false;
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: wasArchived ? "external_document.archived" : "external_document.updated",
      entityType: existing.relatedEntityType,
      entityId: existing.relatedEntityId,
      before: sanitizedForAudit(diff.before),
      after: sanitizedForAudit(diff.after),
    });
  }

  return NextResponse.json({ externalDocumentLink: updated });
}
