import type { CalendarSourceType } from "@/lib/calendar/constants";

// One restrained, theme-aware color per source module (see the --cal-* tokens
// in globals.css) — never per individual event or category — so the
// calendar stays legible instead of becoming a 47-color mess.
export const CALENDAR_SOURCE_COLOR_VARS: Record<
  CalendarSourceType,
  { bg: string; fg: string; border: string }
> = {
  work_order: { bg: "var(--cal-work-order-bg)", fg: "var(--cal-work-order-fg)", border: "var(--cal-work-order-border)" },
  preventive_maintenance: { bg: "var(--cal-pm-bg)", fg: "var(--cal-pm-fg)", border: "var(--cal-pm-border)" },
  inspection: { bg: "var(--cal-inspection-bg)", fg: "var(--cal-inspection-fg)", border: "var(--cal-inspection-border)" },
  compliance: { bg: "var(--cal-compliance-bg)", fg: "var(--cal-compliance-fg)", border: "var(--cal-compliance-border)" },
  lease: { bg: "var(--cal-lease-bg)", fg: "var(--cal-lease-fg)", border: "var(--cal-lease-border)" },
  manual: { bg: "var(--cal-manual-bg)", fg: "var(--cal-manual-fg)", border: "var(--cal-manual-border)" },
};
