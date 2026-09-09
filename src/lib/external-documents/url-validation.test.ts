import { describe, expect, it } from "vitest";

import { isSafeExternalUrl, sanitizeUrlForAudit } from "./url-validation";

describe("isSafeExternalUrl", () => {
  it("accepts a plain https URL", () => {
    expect(isSafeExternalUrl("https://contoso.sharepoint.com/sites/ops/doc.pdf")).toBe(true);
  });

  it("accepts an https URL with a query string", () => {
    expect(isSafeExternalUrl("https://contoso.sharepoint.com/doc?d=abc123&e=1")).toBe(true);
  });

  it("rejects http (non-https)", () => {
    expect(isSafeExternalUrl("http://contoso.sharepoint.com/doc.pdf")).toBe(false);
  });

  it("rejects javascript:", () => {
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data:", () => {
    expect(isSafeExternalUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects file:", () => {
    expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects vbscript:", () => {
    expect(isSafeExternalUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(isSafeExternalUrl("not a url")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSafeExternalUrl("")).toBe(false);
  });
});

describe("sanitizeUrlForAudit", () => {
  it("drops the query string and hash", () => {
    expect(sanitizeUrlForAudit("https://contoso.sharepoint.com/doc?token=secret#frag")).toBe(
      "https://contoso.sharepoint.com/doc",
    );
  });

  it("leaves a URL with no query string unchanged in shape", () => {
    expect(sanitizeUrlForAudit("https://contoso.sharepoint.com/sites/ops/doc.pdf")).toBe(
      "https://contoso.sharepoint.com/sites/ops/doc.pdf",
    );
  });

  it("falls back to the raw input for an unparseable value", () => {
    expect(sanitizeUrlForAudit("not a url")).toBe("not a url");
  });
});
