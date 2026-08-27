import { describe, expect, it } from "vitest";

import { MAX_FILE_SIZE_BYTES, validateFileUpload } from "./validation";

describe("validateFileUpload", () => {
  it("accepts an allowed type within the size limit", () => {
    expect(validateFileUpload({ mimeType: "application/pdf", sizeBytes: 1024 })).toEqual({
      ok: true,
    });
  });

  it("rejects a disallowed MIME type", () => {
    const result = validateFileUpload({ mimeType: "application/x-msdownload", sizeBytes: 1024 });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const result = validateFileUpload({ mimeType: "application/pdf", sizeBytes: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const result = validateFileUpload({
      mimeType: "application/pdf",
      sizeBytes: MAX_FILE_SIZE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(
      validateFileUpload({ mimeType: "application/pdf", sizeBytes: MAX_FILE_SIZE_BYTES }).ok,
    ).toBe(true);
  });
});
