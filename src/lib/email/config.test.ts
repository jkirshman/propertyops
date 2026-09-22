import { describe, expect, it } from "vitest";

import { formatFromAddress, getEmailConfigStatus, isEmailSendingEnabled, resolveEmailSendGate } from "./config";

describe("isEmailSendingEnabled", () => {
  it("defaults to disabled when unset", () => {
    expect(isEmailSendingEnabled({})).toBe(false);
  });

  it("is disabled for any value other than the string 'true'", () => {
    expect(isEmailSendingEnabled({ EMAIL_ENABLED: "1" })).toBe(false);
    expect(isEmailSendingEnabled({ EMAIL_ENABLED: "yes" })).toBe(false);
  });

  it("is enabled only when explicitly set to 'true'", () => {
    expect(isEmailSendingEnabled({ EMAIL_ENABLED: "true" })).toBe(true);
  });
});

describe("getEmailConfigStatus", () => {
  it("reports fully unconfigured state", () => {
    expect(getEmailConfigStatus({})).toEqual({
      enabled: false,
      hasApiKey: false,
      hasFromAddress: false,
      hasAppBaseUrl: false,
    });
  });

  it("reports enabled and configured", () => {
    expect(
      getEmailConfigStatus({
        EMAIL_ENABLED: "true",
        RESEND_API_KEY: "re_test",
        EMAIL_FROM_ADDRESS: "noreply@example.com",
        APP_BASE_URL: "https://propertyops.lawassetgroup.com",
      }),
    ).toEqual({ enabled: true, hasApiKey: true, hasFromAddress: true, hasAppBaseUrl: true });
  });

  it("reports hasAppBaseUrl independently of the other flags", () => {
    expect(getEmailConfigStatus({ APP_BASE_URL: "https://example.com" }).hasAppBaseUrl).toBe(true);
  });
});

describe("formatFromAddress", () => {
  it("wraps a bare address with the PropertyOps display name", () => {
    expect(formatFromAddress({ EMAIL_FROM_ADDRESS: "properties@lawassetgroup.com" })).toBe(
      "PropertyOps <properties@lawassetgroup.com>",
    );
  });

  it("keeps an already display-named value verbatim", () => {
    expect(formatFromAddress({ EMAIL_FROM_ADDRESS: " PropertyOps <properties@lawassetgroup.com> " })).toBe(
      "PropertyOps <properties@lawassetgroup.com>",
    );
  });

  it("returns null when unset", () => {
    expect(formatFromAddress({})).toBeNull();
  });
});

describe("resolveEmailSendGate", () => {
  it("EMAIL_ENABLED=false is authoritative: skipped even when fully configured", () => {
    expect(
      resolveEmailSendGate(
        getEmailConfigStatus({ EMAIL_ENABLED: "false", RESEND_API_KEY: "k", EMAIL_FROM_ADDRESS: "a@b.com" }),
      ),
    ).toBe("skipped_disabled");
  });

  it("enabled but missing key or from address is not_configured", () => {
    expect(resolveEmailSendGate(getEmailConfigStatus({ EMAIL_ENABLED: "true", RESEND_API_KEY: "k" }))).toBe(
      "not_configured",
    );
  });

  it("enabled and configured sends", () => {
    expect(
      resolveEmailSendGate(
        getEmailConfigStatus({ EMAIL_ENABLED: "true", RESEND_API_KEY: "k", EMAIL_FROM_ADDRESS: "a@b.com" }),
      ),
    ).toBe("send");
  });
});
