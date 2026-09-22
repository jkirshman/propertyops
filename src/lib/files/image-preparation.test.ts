import { describe, expect, it } from "vitest";

import {
  buildPreparedPhotoName,
  checkPreparedPhotoSize,
  computeTargetDimensions,
  describePhotoUploadFailure,
  isHeicImage,
  PHOTO_COMPRESS_ABOVE_BYTES,
  PHOTO_MAX_UPLOAD_BYTES,
  PHOTO_MESSAGES,
  planPhotoPreparation,
  shouldUseCompressedResult,
} from "./image-preparation";
import { MAX_FILE_SIZE_BYTES, validateFileUpload } from "./validation";

const MB = 1024 * 1024;

describe("planPhotoPreparation", () => {
  it("compresses a typical large iPhone JPEG", () => {
    expect(planPhotoPreparation({ name: "IMG_4821.jpg", type: "image/jpeg", size: 5.2 * MB })).toEqual({
      action: "compress",
      forceJpeg: false,
    });
  });

  it("compresses large PNG and WebP images too", () => {
    expect(planPhotoPreparation({ name: "a.png", type: "image/png", size: 3 * MB }).action).toBe("compress");
    expect(planPhotoPreparation({ name: "a.webp", type: "image/webp", size: 3 * MB }).action).toBe("compress");
  });

  it("leaves an already-small image unchanged", () => {
    expect(
      planPhotoPreparation({ name: "small.jpg", type: "image/jpeg", size: PHOTO_COMPRESS_ABOVE_BYTES }),
    ).toEqual({ action: "passthrough", reason: "small_image" });
  });

  it("falls back to the extension when the picker gives no MIME type", () => {
    expect(planPhotoPreparation({ name: "photo.JPG", type: "", size: 4 * MB }).action).toBe("compress");
  });

  it("always converts HEIC/HEIF to JPEG, by MIME type or extension", () => {
    expect(planPhotoPreparation({ name: "IMG_1.HEIC", type: "image/heic", size: 100_000 })).toEqual({
      action: "compress",
      forceJpeg: true,
    });
    expect(planPhotoPreparation({ name: "IMG_1.heif", type: "", size: 100_000 })).toEqual({
      action: "compress",
      forceJpeg: true,
    });
  });

  it("never re-encodes a GIF", () => {
    expect(planPhotoPreparation({ name: "a.gif", type: "image/gif", size: 3 * MB })).toEqual({
      action: "passthrough",
      reason: "non_compressible_image",
    });
  });

  it("rejects image formats the app can't handle, with a friendly message", () => {
    expect(planPhotoPreparation({ name: "scan.tiff", type: "image/tiff", size: MB })).toEqual({
      action: "reject",
      message: PHOTO_MESSAGES.unsupportedType,
    });
  });

  it("lets non-image files bypass image compression entirely", () => {
    expect(planPhotoPreparation({ name: "lease.pdf", type: "application/pdf", size: 8 * MB })).toEqual({
      action: "passthrough",
      reason: "not_an_image",
    });
  });
});

describe("isHeicImage", () => {
  it("detects HEIC by type or extension and ignores JPEGs", () => {
    expect(isHeicImage({ name: "x.jpg", type: "image/heif" })).toBe(true);
    expect(isHeicImage({ name: "x.heic", type: "" })).toBe(true);
    expect(isHeicImage({ name: "x.jpg", type: "image/jpeg" })).toBe(false);
  });
});

describe("shouldUseCompressedResult", () => {
  it("keeps the compressed file only when it is smaller", () => {
    expect(shouldUseCompressedResult({ originalSize: 5 * MB, compressedSize: 600_000, forceJpeg: false })).toBe(true);
    expect(shouldUseCompressedResult({ originalSize: 2 * MB, compressedSize: 2 * MB, forceJpeg: false })).toBe(false);
  });

  it("always keeps a forced HEIC conversion, even if larger", () => {
    expect(shouldUseCompressedResult({ originalSize: MB, compressedSize: 2 * MB, forceJpeg: true })).toBe(true);
  });
});

describe("computeTargetDimensions", () => {
  it("caps the long edge of a 12MP portrait photo at 1800px, preserving aspect", () => {
    expect(computeTargetDimensions(3024, 4032)).toEqual({ width: 1350, height: 1800 });
  });

  it("never upscales a small image", () => {
    expect(computeTargetDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("buildPreparedPhotoName", () => {
  it("swaps the extension for .jpg and sanitizes the name", () => {
    expect(buildPreparedPhotoName("IMG_4821.HEIC")).toBe("img_4821.jpg");
    expect(buildPreparedPhotoName("Front of Building (2).png")).toBe("front-of-building-2.jpg");
  });

  it("strips any path and falls back to a default name", () => {
    expect(buildPreparedPhotoName("C:\\Users\\me\\Pictures\\roof.jpg")).toBe("roof.jpg");
    expect(buildPreparedPhotoName("/var/mobile/tmp/garage.jpeg")).toBe("garage.jpg");
    expect(buildPreparedPhotoName("")).toBe("photo.jpg");
    expect(buildPreparedPhotoName("###.jpg")).toBe("photo.jpg");
  });
});

describe("checkPreparedPhotoSize", () => {
  it("accepts a file at the client upload ceiling", () => {
    expect(checkPreparedPhotoSize({ size: PHOTO_MAX_UPLOAD_BYTES, wasCompressed: true })).toEqual({ ok: true });
  });

  it("explains an over-ceiling file differently depending on whether it was compressed", () => {
    expect(checkPreparedPhotoSize({ size: PHOTO_MAX_UPLOAD_BYTES + 1, wasCompressed: true })).toEqual({
      ok: false,
      message: PHOTO_MESSAGES.stillTooLarge,
    });
    expect(checkPreparedPhotoSize({ size: PHOTO_MAX_UPLOAD_BYTES + 1, wasCompressed: false })).toEqual({
      ok: false,
      message: PHOTO_MESSAGES.tooLarge,
    });
  });

  it("keeps the client ceiling below Vercel's 4.5MB body limit and the server limit", () => {
    expect(PHOTO_MAX_UPLOAD_BYTES).toBeLessThan(4.5 * MB);
    expect(PHOTO_MAX_UPLOAD_BYTES).toBeLessThanOrEqual(MAX_FILE_SIZE_BYTES);
  });
});

describe("prepared photo metadata", () => {
  it("a compressed photo's name/type/size pass the unchanged server validation", () => {
    const prepared = { name: buildPreparedPhotoName("IMG_9.HEIC"), type: "image/jpeg", size: 700_000 };
    expect(prepared.name).toBe("img_9.jpg");
    expect(validateFileUpload({ mimeType: prepared.type, sizeBytes: prepared.size })).toEqual({ ok: true });
  });

  it("the server still rejects HEIC if it ever arrives unconverted", () => {
    expect(validateFileUpload({ mimeType: "image/heic", sizeBytes: 100_000 }).ok).toBe(false);
  });
});

describe("describePhotoUploadFailure", () => {
  it("maps a platform 413 (non-JSON body) to a friendly size message", () => {
    expect(describePhotoUploadFailure(413, undefined)).toBe(PHOTO_MESSAGES.tooLarge);
  });

  it("maps auth, scope and storage failures", () => {
    expect(describePhotoUploadFailure(401, "unauthenticated")).toBe(PHOTO_MESSAGES.sessionExpired);
    expect(describePhotoUploadFailure(403, "forbidden")).toBe(PHOTO_MESSAGES.forbidden);
    expect(describePhotoUploadFailure(404, "not_found")).toBe(PHOTO_MESSAGES.notFound);
    expect(describePhotoUploadFailure(503, "file_storage_not_configured")).toBe(PHOTO_MESSAGES.storageUnavailable);
  });

  it("never echoes a raw error code", () => {
    expect(describePhotoUploadFailure(400, "invalid_file")).toBe(PHOTO_MESSAGES.genericUpload);
    expect(describePhotoUploadFailure(500, null)).toBe(PHOTO_MESSAGES.genericUpload);
  });
});
