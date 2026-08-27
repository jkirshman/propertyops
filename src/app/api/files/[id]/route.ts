import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getFileRecord, streamPrivateFile } from "@/lib/files/files";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Org-scoped lookup IS the permission check: a file outside the caller's
  // organization resolves to nothing, never to someone else's private blob.
  const record = await getFileRecord(user.organizationId, id);
  if (!record) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const blob = await streamPrivateFile(record.blobPathname);
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "file.download",
    entityType: "file",
    entityId: record.id,
  });

  return new Response(blob.stream, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(record.fileName)}"`,
    },
  });
}
