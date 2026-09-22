// MOBILE-1: pure decision logic for preparing a photo before upload. The
// browser-only canvas work lives in client-image-compression.ts; everything
// here is plain data in, plain data out so it can be unit-tested.
//
// Settings adapted from the AssetOps location-profile photo uploader
// (reference only — nothing is imported from it): long edge capped at
// 1800px, JPEG quality 0.82, orientation taken from EXIF, HEIC/HEIF forced
// through a browser decode to JPEG. PropertyOps differs in one deliberate
// way: AssetOps only compresses above 5MB, which is above Vercel's 4.5MB
// function request-body limit, so PropertyOps compresses much earlier and
// caps the prepared upload below that platform limit.

export const PHOTO_MAX_DIMENSION_PX = 1800;
export const PHOTO_JPEG_QUALITY = 0.82;
export const PHOTO_OUTPUT_TYPE = "image/jpeg";

/** Images at or below this size upload as-is (no re-encode). */
export const PHOTO_COMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024;

/**
 * Largest prepared photo the client will send. Vercel rejects function
 * request bodies over 4.5MB before the route runs; 4MB leaves headroom for
 * multipart overhead and the other form fields. The server-side 10MB check
 * in validation.ts remains the final safety boundary.
 */
export const PHOTO_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COMPRESSIBLE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
// GIF is an allowed upload type but is never re-encoded — flattening it to
// a JPEG would silently drop animation.
const PASSTHROUGH_IMAGE_TYPES = new Set(["image/gif"]);
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_EXTENSIONS = [".heic", ".heif"];

export const PHOTO_MESSAGES = {
  unsupportedType: "This image format isn't supported. Please choose a JPG, PNG, or WebP photo.",
  heicConversionFailed:
    "This iPhone photo format (HEIC) couldn't be converted in this browser. Please choose a JPG or PNG, or set the camera to “Most Compatible”.",
  processingFailed: "We couldn't prepare this photo. Please try a different photo or take a new one.",
  stillTooLarge: "This photo is still too large after compression. Please try a different photo.",
  tooLarge: "This file is too large to upload. Please choose a smaller file.",
  genericUpload: "Could not upload the photo. Please try again.",
  storageUnavailable: "Photo storage isn't available right now. Please try again later or contact an admin.",
  forbidden: "You don't have permission to upload photos here.",
  notFound: "This item could not be found. Refresh the page and try again.",
  sessionExpired: "Your session has expired. Please sign in again.",
} as const;

export interface FileDescriptor {
  name: string;
  type: string;
  size: number;
}

export type PhotoPreparationPlan =
  | { action: "compress"; forceJpeg: boolean }
  | { action: "passthrough"; reason: "small_image" | "non_compressible_image" | "not_an_image" }
  | { action: "reject"; message: string };

function lowerName(file: Pick<FileDescriptor, "name">) {
  return String(file.name || "").toLowerCase();
}

export function isHeicImage(file: Pick<FileDescriptor, "name" | "type">): boolean {
  const type = String(file.type || "").toLowerCase();
  return HEIC_TYPES.has(type) || HEIC_EXTENSIONS.some((ext) => lowerName(file).endsWith(ext));
}

function isCompressibleImage(file: Pick<FileDescriptor, "name" | "type">): boolean {
  const type = String(file.type || "").toLowerCase();
  if (type) return COMPRESSIBLE_TYPES.has(type);
  // Some mobile pickers hand over an empty MIME type; fall back to extension.
  return COMPRESSIBLE_EXTENSIONS.some((ext) => lowerName(file).endsWith(ext));
}

/**
 * Decides what to do with a selected file before upload:
 * - JPEG/PNG/WebP over the threshold → compress (resize + re-encode to JPEG)
 * - HEIC/HEIF → always compress with forceJpeg (the server doesn't accept
 *   HEIC; conversion works only where the browser can decode it)
 * - small JPEG/PNG/WebP, GIF → upload unchanged
 * - other image/* formats (TIFF, SVG, …) → reject with a friendly message
 * - non-images → untouched; left entirely to normal server-side validation
 */
export function planPhotoPreparation(file: FileDescriptor): PhotoPreparationPlan {
  const type = String(file.type || "").toLowerCase();

  if (isHeicImage(file)) {
    return { action: "compress", forceJpeg: true };
  }

  if (isCompressibleImage(file)) {
    return file.size > PHOTO_COMPRESS_ABOVE_BYTES
      ? { action: "compress", forceJpeg: false }
      : { action: "passthrough", reason: "small_image" };
  }

  if (PASSTHROUGH_IMAGE_TYPES.has(type)) {
    return { action: "passthrough", reason: "non_compressible_image" };
  }

  if (type.startsWith("image/")) {
    return { action: "reject", message: PHOTO_MESSAGES.unsupportedType };
  }

  return { action: "passthrough", reason: "not_an_image" };
}

/**
 * After a re-encode, keep the original unless the result is actually
 * smaller — except for forced conversions (HEIC), where the original
 * format can't be uploaded at all.
 */
export function shouldUseCompressedResult(input: {
  originalSize: number;
  compressedSize: number;
  forceJpeg: boolean;
}): boolean {
  return input.forceJpeg || input.compressedSize < input.originalSize;
}

/** Scales (width, height) so the longest side is at most maxDimension. Never upscales. */
export function computeTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number = PHOTO_MAX_DIMENSION_PX,
): { width: number; height: number } {
  const longestSide = Math.max(sourceWidth, sourceHeight);
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

/** "IMG_1234.HEIC" → "img_1234.jpg". Never includes a path. */
export function buildPreparedPhotoName(originalName: string): string {
  const leaf = String(originalName || "").split(/[\\/]/).pop() ?? "";
  const base = leaf
    .replace(/\.[^.]+$/, "")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${base || "photo"}.jpg`;
}

/** Client-side ceiling check on whatever file is about to be sent. */
export function checkPreparedPhotoSize(input: {
  size: number;
  wasCompressed: boolean;
}): { ok: true } | { ok: false; message: string } {
  if (input.size <= PHOTO_MAX_UPLOAD_BYTES) return { ok: true };
  return {
    ok: false,
    message: input.wasCompressed ? PHOTO_MESSAGES.stillTooLarge : PHOTO_MESSAGES.tooLarge,
  };
}

/**
 * Maps an upload failure (HTTP status + the route's JSON `error` code, if
 * any) to a user-facing message. Raw platform/Blob text is never shown —
 * a Vercel 413 arrives as a non-JSON body, so errorCode is then undefined.
 */
export function describePhotoUploadFailure(status: number, errorCode?: string | null): string {
  if (status === 413) return PHOTO_MESSAGES.tooLarge;
  if (status === 401) return PHOTO_MESSAGES.sessionExpired;
  if (status === 403) return PHOTO_MESSAGES.forbidden;
  if (status === 404) return PHOTO_MESSAGES.notFound;
  if (status === 503 || errorCode === "file_storage_not_configured") return PHOTO_MESSAGES.storageUnavailable;
  return PHOTO_MESSAGES.genericUpload;
}
