import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getFileRecord, streamPrivateFile } from "@/lib/files/files";
import { getRelatedEntityFileRules } from "@/lib/files/related-entity-rules";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { user, capabilityKeys } = context;
  const { id } = await params;

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

  return new Response(blob.stream, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(record.fileName)}"`,
    },
  });
}
