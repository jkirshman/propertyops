import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { isFileStorageConfigured, listFilesForOrganization, uploadPrivateFile } from "@/lib/files/files";
import { PROPERTY_CAPABILITIES, PROPERTY_FILES_ENTITY_TYPE } from "@/lib/properties/constants";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { user, capabilityKeys } = context;
  const { searchParams } = new URL(request.url);
  const relatedEntityType = searchParams.get("relatedEntityType") ?? undefined;
  const relatedEntityId = searchParams.get("relatedEntityId") ?? undefined;

  if (relatedEntityType === PROPERTY_FILES_ENTITY_TYPE && !capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const records = await listFilesForOrganization(
    user.organizationId,
    relatedEntityType && relatedEntityId ? { relatedEntityType, relatedEntityId } : undefined,
  );
  return NextResponse.json({ files: records });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { user, capabilityKeys } = context;

  if (!isFileStorageConfigured()) {
    return NextResponse.json({ error: "file_storage_not_configured" }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const rawRelatedType = formData?.get("relatedEntityType");
  const rawRelatedId = formData?.get("relatedEntityId");
  const rawTitle = formData?.get("title");

  const relatedEntityType = typeof rawRelatedType === "string" && rawRelatedType ? rawRelatedType : undefined;
  const relatedEntityId = typeof rawRelatedId === "string" && rawRelatedId ? rawRelatedId : undefined;
  const title = typeof rawTitle === "string" && rawTitle ? rawTitle : undefined;

  if (
    relatedEntityType === PROPERTY_FILES_ENTITY_TYPE &&
    !capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let record;
  try {
    record = await uploadPrivateFile({
      organizationId: user.organizationId,
      uploadedByUserId: user.id,
      file,
      relatedEntityType,
      relatedEntityId,
      title,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    return NextResponse.json({ error: "invalid_file", message }, { status: 400 });
  }

  if (relatedEntityType === PROPERTY_FILES_ENTITY_TYPE && relatedEntityId) {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "property.document_upload",
      entityType: "property",
      entityId: relatedEntityId,
      after: { fileId: record.id, fileName: record.fileName },
    });
  } else {
    await recordAuditEvent({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "file.upload",
      entityType: "file",
      entityId: record.id,
    });
  }

  return NextResponse.json({ file: record }, { status: 201 });
}
