// Vendor-specific thin wrapper over the shared form-validation helpers
// (src/lib/forms/field-errors.ts) — kept so existing imports/tests continue
// to work unchanged while the actual logic lives in one shared place.

import { describeApiError, mapFieldErrors } from "@/lib/forms/field-errors";

export const VENDOR_ERROR_CODE_MESSAGES: Record<string, string> = {
  unauthenticated: "Your session has expired. Please log in again.",
  forbidden: "You don't have permission to do that.",
  not_found: "This vendor could not be found.",
};

export function describeVendorApiError(errorCode: string | undefined): string {
  return describeApiError(errorCode, VENDOR_ERROR_CODE_MESSAGES);
}

export { mapFieldErrors };
