"use client";

import { UNIT_FILTER_ALL, isUnitFilterUseful, type UnitFilterOption } from "@/lib/property-units/unit-display";

/**
 * UNIT-OPS-1: "All | Property-wide / Shared | <Units>" filter for Unit-ownable
 * lists. Options come from buildUnitFilterOptions over rows the server
 * already scoped, so a Unit-restricted viewer only ever sees their own Units
 * here. Hidden when it couldn't narrow anything.
 */
export function UnitFilterSelect({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: UnitFilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (!isUnitFilterUseful(options)) {
    return null;
  }
  return (
    <select
      id={id}
      aria-label="Filter by Unit / Suite"
      className="input"
      style={{ maxWidth: 220 }}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.value === UNIT_FILTER_ALL ? "All Units / Suites" : option.label}
        </option>
      ))}
    </select>
  );
}
