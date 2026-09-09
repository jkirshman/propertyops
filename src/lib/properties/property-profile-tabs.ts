export const TABS = [
  "overview",
  "equipment",
  "assets",
  "workorders",
  "maintenance",
  "vendors",
  "inspections",
  "compliance",
  "leases",
  "units",
  "components",
  "photos",
  "contacts",
  "notes",
  "documents",
  "activity",
] as const;

export type Tab = (typeof TABS)[number];

export function parseTab(value: string | undefined | null): Tab | undefined {
  return (TABS as readonly string[]).includes(value ?? "") ? (value as Tab) : undefined;
}
