// MOBILE-1: browser-only half of photo preparation. Decision logic (when to
// compress, sizes, naming, messages) is in image-preparation.ts. The decode →
// canvas → JPEG approach mirrors the AssetOps location-profile uploader.

import {
  buildPreparedPhotoName,
  computeTargetDimensions,
  isHeicImage,
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_DIMENSION_PX,
  PHOTO_MESSAGES,
  PHOTO_OUTPUT_TYPE,
  planPhotoPreparation,
  shouldUseCompressedResult,
} from "@/lib/files/image-preparation";

export type PreparedPhoto =
  | { ok: true; file: File; wasCompressed: boolean }
  | { ok: false; message: string };

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" applies the EXIF orientation, so portrait phone photos
      // stay upright once the orientation tag is dropped by the re-encode.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall back to <img>, which also honors EXIF orientation in modern browsers.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode_failed"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function compressToJpeg(file: File): Promise<File> {
  const image = await decodeImage(file);
  const sourceWidth = "naturalWidth" in image ? image.naturalWidth : image.width;
  const sourceHeight = "naturalHeight" in image ? image.naturalHeight : image.height;
  if (!sourceWidth || !sourceHeight) throw new Error("decode_failed");

  const { width, height } = computeTargetDimensions(sourceWidth, sourceHeight, PHOTO_MAX_DIMENSION_PX);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");

  // JPEG has no alpha — paint white first so transparent PNG areas don't turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  if ("close" in image) image.close();

  const blob = await canvasToBlob(canvas, PHOTO_OUTPUT_TYPE, PHOTO_JPEG_QUALITY);
  if (!blob) throw new Error("encode_failed");

  return new File([blob], buildPreparedPhotoName(file.name), {
    type: PHOTO_OUTPUT_TYPE,
    lastModified: Date.now(),
  });
}

/**
 * Returns the file to actually upload. The returned File carries its own
 * (compressed) name, type and size, so upload routes that read file.name /
 * file.type / file.size store accurate metadata without any changes.
 */
export async function preparePhotoForUpload(file: File): Promise<PreparedPhoto> {
  const plan = planPhotoPreparation(file);

  if (plan.action === "reject") return { ok: false, message: plan.message };
  if (plan.action === "passthrough") return { ok: true, file, wasCompressed: false };

  try {
    const compressed = await compressToJpeg(file);
    if (shouldUseCompressedResult({ originalSize: file.size, compressedSize: compressed.size, forceJpeg: plan.forceJpeg })) {
      return { ok: true, file: compressed, wasCompressed: true };
    }
    return { ok: true, file, wasCompressed: false };
  } catch {
    return {
      ok: false,
      message: isHeicImage(file) ? PHOTO_MESSAGES.heicConversionFailed : PHOTO_MESSAGES.processingFailed,
    };
  }
}
