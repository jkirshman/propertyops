// Decides what a pointer click on an interactive table row should do. The
// row's primary cell always holds a real <a>, which is what keyboard and
// screen-reader users operate; the row-level click is only a pointer
// convenience, so it must stay out of the way of nested controls, text
// selection, and modified clicks.

export type RowClickAction = "none" | "navigate" | "navigate-new-tab";

export type RowClickInput = {
  /** MouseEvent.button — 0 is the primary button. */
  button: number;
  defaultPrevented: boolean;
  /** The click landed on (or inside) a link, button, form control, etc. */
  targetIsInteractive: boolean;
  /** The user has an active text selection (e.g. copying an email). */
  hasTextSelection: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
};

/** Elements whose own click must never be hijacked by the parent row. */
export const ROW_CLICK_INTERACTIVE_SELECTOR =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";

export function resolveRowClick(input: RowClickInput): RowClickAction {
  if (input.button !== 0) return "none";
  if (input.defaultPrevented) return "none";
  if (input.targetIsInteractive) return "none";
  if (input.hasTextSelection) return "none";
  if (input.metaKey || input.ctrlKey || input.shiftKey) return "navigate-new-tab";
  return "navigate";
}
