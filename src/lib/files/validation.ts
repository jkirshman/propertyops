export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function validateFileUpload(input: {
  mimeType: string;
  sizeBytes: number;
}): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    return { ok: false, error: `File type "${input.mimeType}" is not allowed.` };
  }

  if (input.sizeBytes <= 0) {
    return { ok: false, error: "File is empty." };
  }

  if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`,
    };
  }

  return { ok: true };
}
