"use client";

import { formatUnitOptionLabel, PROPERTY_WIDE_UNIT_LABEL } from "@/lib/property-units/unit-display";

export interface UnitSelectOptions {
  supportsUnits: boolean;
  units: { id: string; unitLabel: string; name: string | null }[];
  wholeProperty: boolean;
}

/**
 * UNIT-OPS-1: the Unit / Suite selector shared by the Work Order and
 * Inspection forms. `value` null = Property-wide / Shared. Renders nothing
 * for a Property type without Units (the server keeps those records Shared).
 * `currentLabel` covers a current Unit that isn't assignable any more (e.g.
 * deactivated) so it still displays instead of silently reading as Shared.
 */
export function UnitSelect({
  id,
  value,
  onChange,
  options,
  allowShared,
  disabled,
  currentLabel,
  hint,
}: {
  id: string;
  value: string | null;
  onChange: (unitId: string | null) => void;
  options: UnitSelectOptions | null;
  allowShared: boolean;
  disabled?: boolean;
  currentLabel?: string | null;
  hint?: string | null;
}) {
  if (!options?.supportsUnits) {
    return null;
  }
  const currentMissing = value !== null && !options.units.some((unit) => unit.id === value);

  return (
    <div>
      <label className="label" htmlFor={id}>
        Unit / Suite
      </label>
      <select
        id={id}
        className="input"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
      >
        {allowShared || value === null ? <option value="">{PROPERTY_WIDE_UNIT_LABEL}</option> : null}
        {currentMissing ? (
          <option value={value ?? ""} disabled>
            {currentLabel ?? "Current Unit/Suite"}
          </option>
        ) : null}
        {options.units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {formatUnitOptionLabel(unit)}
          </option>
        ))}
      </select>
      {hint ? (
        <div className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
