import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isFileStorageConfigured, listFilesForOrganization, uploadPrivateFile } from "@/lib/files/files";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const records = await listFilesForOrganization(user.organizationId);
  return NextResponse.json({ files: records });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!isFileStorageConfigured()) {
    return NextResponse.json({ error: "file_storage_not_configured" }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  let record;
  try {
    record = await uploadPrivateFile({
      organizationId: user.organizationId,
      uploadedByUserId: user.id,
      file,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    return NextResponse.json({ error: "invalid_file", message }, { status: 400 });
  }

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "file.upload",
    entityType: "file",
    entityId: record.id,
  });

  return NextResponse.json({ file: record }, { status: 201 });
}
