import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getFileRecord, streamPrivateFile } from "@/lib/files/files";
import {
  canAccessRelatedEntityPropertyContext,
  getRelatedEntityFileRules,
  resolveRelatedEntityPropertyContext,
} from "@/lib/files/related-entity-rules";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { user, capabilityKeys } = context;
  const { id } = await params;
  // Opt-in only, and only for images — every other caller/file type keeps
  // today's forced-download behavior unchanged (e.g. PDFs, docs).
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  // Org-scoped lookup IS the baseline permission check: a file outside the
  // caller's organization resolves to nothing, never to someone else's private blob.
  const record = await getFileRecord(user.organizationId, id);
  if (!record) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rules = getRelatedEntityFileRules(record.relatedEntityType ?? undefined);
  if (rules && !capabilityKeys.includes(rules.viewCapability)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (record.relatedEntityType && record.relatedEntityId) {
    const context = await resolveRelatedEntityPropertyContext(
      user.organizationId,
      record.relatedEntityType,
      record.relatedEntityId,
    );
    if (context) {
      const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
      if (!canAccessRelatedEntityPropertyContext(scope, context)) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
    }
  }

  const blob = await streamPrivateFile(record.blobPathname);
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (rules && record.relatedEntityType && record.relatedEntityId) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: `${record.relatedEntityType}.document_download`,
      entityType: record.relatedEntityType,
      entityId: record.relatedEntityId,
      after: { fileId: record.id, fileName: record.fileName },
    });
  } else {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "file.download",
      entityType: "file",
      entityId: record.id,
    });
  }

  const renderInline = inline && record.mimeType.startsWith("image/");

  return new Response(blob.stream, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Disposition": renderInline
        ? `inline; filename="${encodeURIComponent(record.fileName)}"`
        : `attachment; filename="${encodeURIComponent(record.fileName)}"`,
    },
  });
}
