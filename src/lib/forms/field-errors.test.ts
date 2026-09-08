import { describe, expect, it } from "vitest";

import { describeApiError, invalidFieldProps, mapFieldErrors, VALIDATION_BANNER_MESSAGE } from "./field-errors";

describe("VALIDATION_BANNER_MESSAGE", () => {
  it("is the standard concise banner text", () => {
    expect(VALIDATION_BANNER_MESSAGE).toBe("Please fix the highlighted fields below.");
  });
});

describe("mapFieldErrors", () => {
  it("takes the first message per field", () => {
    expect(mapFieldErrors({ name: ["Name is required.", "Too short."] })).toEqual({
      name: "Name is required.",
    });
  });

  it("skips fields with no messages", () => {
    expect(mapFieldErrors({ name: [], email: ["Email address is invalid."] })).toEqual({
      email: "Email address is invalid.",
    });
  });

  it("returns an empty object for undefined input", () => {
    expect(mapFieldErrors(undefined)).toEqual({});
  });
});

describe("describeApiError", () => {
  it("maps known default codes to friendly text", () => {
    expect(describeApiError("forbidden")).toBe("You don't have permission to do that.");
    expect(describeApiError("not_found")).toBe("The record could not be found.");
  });

  it("never returns the raw invalid_input code", () => {
    const message = describeApiError("invalid_input");
    expect(message).not.toBe("invalid_input");
    expect(message.length).toBeGreaterThan(0);
  });

  it("supports per-domain overrides", () => {
    expect(describeApiError("invalid_vendor", { invalid_vendor: "That vendor is invalid." })).toBe(
      "That vendor is invalid.",
    );
  });

  it("falls back to a generic message for any unrecognized code", () => {
    const message = describeApiError("some_future_error_code");
    expect(message).not.toBe("some_future_error_code");
    expect(message).toBe(describeApiError(undefined));
  });
});

describe("invalidFieldProps", () => {
  it("returns no aria attributes when the field is valid", () => {
    expect(invalidFieldProps(false)).toEqual({ "aria-invalid": undefined, "aria-describedby": undefined });
  });

  it("marks aria-invalid when the field has an error", () => {
    expect(invalidFieldProps(true)["aria-invalid"]).toBe(true);
  });

  it("only sets aria-describedby when both invalid and an id is given", () => {
    expect(invalidFieldProps(true, "field-hint")["aria-describedby"]).toBe("field-hint");
    expect(invalidFieldProps(true)["aria-describedby"]).toBeUndefined();
    expect(invalidFieldProps(false, "field-hint")["aria-describedby"]).toBeUndefined();
  });
});
