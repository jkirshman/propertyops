import { describe, expect, it } from "vitest";

import { getEmailConfigStatus, isEmailSendingEnabled } from "./config";

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
    });
  });

  it("reports enabled and configured", () => {
    expect(
      getEmailConfigStatus({
        EMAIL_ENABLED: "true",
        RESEND_API_KEY: "re_test",
        EMAIL_FROM_ADDRESS: "noreply@example.com",
      }),
    ).toEqual({ enabled: true, hasApiKey: true, hasFromAddress: true });
  });
});
