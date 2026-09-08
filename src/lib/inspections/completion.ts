export interface CompletionCheckInput {
  id: string;
  itemLabel: string;
  itemRequired: boolean;
  itemResponseType: string;
  value: string | null;
  outcome: "pass" | "fail" | null;
}

/**
 * A required item counts as answered when it has a non-blank value, or (for
 * pass_fail items specifically) a recorded outcome. Returns the required
 * items still missing an answer — empty means the inspection can complete.
 */
export function getIncompleteRequiredResponses(
  responses: CompletionCheckInput[],
): CompletionCheckInput[] {
  return responses.filter((response) => {
    if (!response.itemRequired) {
      return false;
    }
    if (response.itemResponseType === "pass_fail") {
      return response.outcome === null;
    }
    return !response.value || response.value.trim() === "";
  });
}

export function canCompleteInspection(responses: CompletionCheckInput[]): boolean {
  return getIncompleteRequiredResponses(responses).length === 0;
}
