import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getFileRecord, streamPrivateFile } from "@/lib/files/files";
import { PROPERTY_CAPABILITIES, PROPERTY_FILES_ENTITY_TYPE } from "@/lib/properties/constants";

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

  if (
    record.relatedEntityType === PROPERTY_FILES_ENTITY_TYPE &&
    !capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const blob = await streamPrivateFile(record.blobPathname);
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (record.relatedEntityType === PROPERTY_FILES_ENTITY_TYPE && record.relatedEntityId) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "property.document_download",
      entityType: "property",
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
