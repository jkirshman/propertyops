import type { InspectionOutcome, InspectionResult } from "./constants";

export interface ResultInput {
  itemRequired: boolean;
  outcome: InspectionOutcome | null;
}

/**
 * Only pass_fail-type responses carry an outcome — other response types
 * (yes/no, text, numeric, date, choice) never influence the overall result.
 * This is deliberately simple rather than a generalized scoring engine:
 * - any required item failing => failed
 * - any (non-required) item failing, with no required failures => passed_with_findings
 * - otherwise => passed
 */
export function calculateOverallResult(responses: ResultInput[]): InspectionResult {
  let hasRequiredFailure = false;
  let hasAnyFailure = false;

  for (const response of responses) {
    if (response.outcome === "fail") {
      hasAnyFailure = true;
      if (response.itemRequired) {
        hasRequiredFailure = true;
      }
    }
  }

  if (hasRequiredFailure) {
    return "failed";
  }
  if (hasAnyFailure) {
    return "passed_with_findings";
  }
  return "passed";
}
