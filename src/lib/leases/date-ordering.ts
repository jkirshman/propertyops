export interface LeaseDates {
  startDate?: string | null;
  endDate?: string | null;
  moveInDate?: string | null;
  moveOutDate?: string | null;
}

export interface LeaseDateOrderingIssue {
  field: "endDate" | "moveOutDate";
  message: string;
}

/**
 * Pure date-ordering rules, shared by the Zod schema (new/fully-specified
 * input) and the API route (partial updates merged against the existing
 * stored dates, since a PATCH that only touches one field can't validate
 * cross-field ordering from the request body alone).
 */
export function getLeaseDateOrderingIssues(dates: LeaseDates): LeaseDateOrderingIssue[] {
  const issues: LeaseDateOrderingIssue[] = [];

  if (dates.startDate && dates.endDate && dates.endDate < dates.startDate) {
    issues.push({ field: "endDate", message: "End date cannot be before the start date." });
  }
  if (dates.moveInDate && dates.moveOutDate && dates.moveOutDate < dates.moveInDate) {
    issues.push({ field: "moveOutDate", message: "Move-out date cannot be before the move-in date." });
  }

  return issues;
}
