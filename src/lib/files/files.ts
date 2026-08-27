import { randomUUID } from "node:crypto";

import { get, put } from "@vercel/blob";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { files } from "@/db/schema";
import { validateFileUpload } from "@/lib/files/validation";

export function isFileStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function uploadPrivateFile(params: {
  organizationId: string;
  uploadedByUserId: string;
  file: File;
}) {
  const validation = validateFileUpload({
    mimeType: params.file.type,
    sizeBytes: params.file.size,
  });
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const pathname = `org/${params.organizationId}/${randomUUID()}-${params.file.name}`;

  await put(pathname, params.file, {
    access: "private",
    contentType: params.file.type,
    addRandomSuffix: false,
  });

  const [record] = await db
    .insert(files)
    .values({
      organizationId: params.organizationId,
      uploadedByUserId: params.uploadedByUserId,
      fileName: params.file.name,
      mimeType: params.file.type,
      sizeBytes: params.file.size,
      blobPathname: pathname,
    })
    .returning();

  return record;
}

export async function listFilesForOrganization(organizationId: string) {
  return db
    .select()
    .from(files)
    .where(eq(files.organizationId, organizationId))
    .orderBy(desc(files.createdAt));
}

export async function getFileRecord(organizationId: string, fileId: string) {
  const [record] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.organizationId, organizationId)))
    .limit(1);

  return record ?? null;
}

export async function streamPrivateFile(pathname: string) {
  return get(pathname, { access: "private" });
}
