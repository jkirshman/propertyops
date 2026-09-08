// Pure helpers for turning a Vendor API error response into safe, user-facing
// text. Kept out of the "use client" form component so they're unit-testable
// without a DOM/React rendering setup.

export const VENDOR_ERROR_CODE_MESSAGES: Record<string, string> = {
  unauthenticated: "Your session has expired. Please log in again.",
  forbidden: "You don't have permission to do that.",
  not_found: "This vendor could not be found.",
};

const FALLBACK_ERROR_MESSAGE = "Could not save the vendor. Please check the fields and try again.";

/** Flattened Zod field errors (Zod's `.flatten().fieldErrors` shape) -> first message per field. */
export function mapFieldErrors(
  fieldErrors: Record<string, string[] | undefined> | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fieldErrors) {
    return result;
  }
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      result[field] = messages[0];
    }
  }
  return result;
}

/**
 * Maps a non-validation API error code (e.g. "forbidden") to safe, friendly
 * text. Never echoes an unrecognized/internal code (such as "invalid_input")
 * back to the user — falls back to a generic message instead.
 */
export function describeVendorApiError(errorCode: string | undefined): string {
  if (errorCode && errorCode in VENDOR_ERROR_CODE_MESSAGES) {
    return VENDOR_ERROR_CODE_MESSAGES[errorCode];
  }
  return FALLBACK_ERROR_MESSAGE;
}
