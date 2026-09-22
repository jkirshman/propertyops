import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getExternalDocumentLink } from "@/lib/external-documents/external-documents";
import { sanitizeUrlForAudit } from "@/lib/external-documents/url-validation";
import {
  canAccessRelatedEntityPropertyContext,
  getRelatedEntityFileRules,
  resolveRelatedEntityPropertyContext,
} from "@/lib/files/related-entity-rules";

/**
 * Audit-only ping fired when a user opens an external link — mirrors the
 * file-download audit trail (`{entityType}.document_download`) for
 * consistency. Never redirects; the client still navigates via a plain
 * <a href> to the stored URL, since PropertyOps never proxies external
 * destinations the way it does private Blob files.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { user, capabilityKeys } = context;
  const { id } = await params;

  const link = await getExternalDocumentLink(user.organizationId, id);
  if (!link) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rules = getRelatedEntityFileRules(link.relatedEntityType);
  if (rules && !capabilityKeys.includes(rules.viewCapability)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const propertyContext = await resolveRelatedEntityPropertyContext(
    user.organizationId,
    link.relatedEntityType,
    link.relatedEntityId,
  );
  if (propertyContext) {
    const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
    if (!canAccessRelatedEntityPropertyContext(scope, propertyContext)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "external_document.opened",
    entityType: link.relatedEntityType,
    entityId: link.relatedEntityId,
    after: { linkId: link.id, externalUrl: sanitizeUrlForAudit(link.externalUrl) },
  });

  return new NextResponse(null, { status: 204 });
}
