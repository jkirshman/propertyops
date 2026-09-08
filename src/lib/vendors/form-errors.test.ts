import { describe, expect, it } from "vitest";

import { describeVendorApiError, mapFieldErrors } from "./form-errors";

describe("mapFieldErrors", () => {
  it("takes the first message per field", () => {
    expect(mapFieldErrors({ name: ["Vendor name is required.", "Too short."] })).toEqual({
      name: "Vendor name is required.",
    });
  });

  it("skips fields with no messages", () => {
    expect(mapFieldErrors({ name: [], primaryEmail: ["Email address is invalid."] })).toEqual({
      primaryEmail: "Email address is invalid.",
    });
  });

  it("returns an empty object for undefined input", () => {
    expect(mapFieldErrors(undefined)).toEqual({});
  });

  it("returns an empty object when there are no field errors", () => {
    expect(mapFieldErrors({})).toEqual({});
  });
});

describe("describeVendorApiError", () => {
  it("maps known error codes to friendly text", () => {
    expect(describeVendorApiError("forbidden")).toBe("You don't have permission to do that.");
    expect(describeVendorApiError("unauthenticated")).toBe(
      "Your session has expired. Please log in again.",
    );
    expect(describeVendorApiError("not_found")).toBe("This vendor could not be found.");
  });

  it("never returns the raw invalid_input code", () => {
    const message = describeVendorApiError("invalid_input");
    expect(message).not.toBe("invalid_input");
    expect(message.length).toBeGreaterThan(0);
  });

  it("falls back to a generic message for any unrecognized code", () => {
    const message = describeVendorApiError("some_future_error_code");
    expect(message).not.toBe("some_future_error_code");
    expect(message).toBe(describeVendorApiError(undefined));
  });

  it("falls back to a generic message when no code is provided", () => {
    expect(describeVendorApiError(undefined).length).toBeGreaterThan(0);
  });
});
