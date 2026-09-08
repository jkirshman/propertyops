// Shared client-side form-validation helpers, used by Vendor/Inspection/
// Compliance (and any future) forms so the presentation standard stays
// consistent: one concise top banner + red-bordered invalid fields, never
// verbose raw Zod/internal text and never a raw API error code.

export const VALIDATION_BANNER_MESSAGE = "Please fix the highlighted fields below.";

const DEFAULT_ERROR_CODE_MESSAGES: Record<string, string> = {
  unauthenticated: "Your session has expired. Please log in again.",
  forbidden: "You don't have permission to do that.",
  not_found: "The record could not be found.",
};

const FALLBACK_ERROR_MESSAGE = "Could not save. Please check the fields and try again.";

/** Flattened Zod field errors (`.flatten().fieldErrors` shape) -> first message per field. */
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
export function describeApiError(
  errorCode: string | undefined,
  overrides: Record<string, string> = {},
): string {
  const messages = { ...DEFAULT_ERROR_CODE_MESSAGES, ...overrides };
  if (errorCode && errorCode in messages) {
    return messages[errorCode];
  }
  return FALLBACK_ERROR_MESSAGE;
}

/** Props to spread onto an <input>/<select>/<textarea> to mark it invalid — red border via CSS, plus accessible wiring. */
export function invalidFieldProps(hasError: boolean, describedById?: string) {
  return {
    "aria-invalid": hasError || undefined,
    "aria-describedby": hasError && describedById ? describedById : undefined,
  } as const;
}
