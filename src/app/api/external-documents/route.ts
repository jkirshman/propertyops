import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import {
  createExternalDocumentLink,
  listExternalDocumentLinks,
} from "@/lib/external-documents/external-documents";
import { sanitizeUrlForAudit } from "@/lib/external-documents/url-validation";
import { getRelatedEntityFileRules } from "@/lib/files/related-entity-rules";
import { createExternalDocumentLinkSchema } from "@/lib/validation/external-documents";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { user, capabilityKeys } = context;

  const { searchParams } = new URL(request.url);
  const relatedEntityType = searchParams.get("relatedEntityType");
  const relatedEntityId = searchParams.get("relatedEntityId");
  if (!relatedEntityType || !relatedEntityId) {
    return NextResponse.json({ error: "missing_related_entity" }, { status: 400 });
  }

  const rules = getRelatedEntityFileRules(relatedEntityType);
  if (rules && !capabilityKeys.includes(rules.viewCapability)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const links = await listExternalDocumentLinks(user.organizationId, { relatedEntityType, relatedEntityId });
  return NextResponse.json({ externalDocumentLinks: links });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { user, capabilityKeys } = context;

  const body = await request.json().catch(() => null);
  const parsed = createExternalDocumentLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const rules = getRelatedEntityFileRules(parsed.data.relatedEntityType);
  if (rules && !capabilityKeys.includes(rules.manageCapability)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const link = await createExternalDocumentLink(user.organizationId, user.id, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "external_document.created",
    entityType: parsed.data.relatedEntityType,
    entityId: parsed.data.relatedEntityId,
    after: {
      linkId: link.id,
      displayName: link.displayName,
      externalUrl: sanitizeUrlForAudit(link.externalUrl),
    },
  });

  return NextResponse.json({ externalDocumentLink: link }, { status: 201 });
}
