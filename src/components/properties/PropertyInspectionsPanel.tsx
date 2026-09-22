"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { UnitFilterSelect } from "@/components/shared/UnitFilterSelect";
import {
  UNIT_FILTER_ALL,
  buildUnitFilterOptions,
  formatRecordUnitLabel,
  matchesUnitFilter,
} from "@/lib/property-units/unit-display";
import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_STATUS_LABELS,
  type InspectionResult,
  type InspectionStatus,
} from "@/lib/inspections/constants";

interface InspectionRow {
  id: string;
  templateName: string;
  status: string;
  overallResult: string | null;
  scheduledDate: string | null;
  updatedAt: string;
  // UNIT-OPS-1
  propertyUnitId: string | null;
  unitLabel: string | null;
  unitIsActive: boolean | null;
}

export function PropertyInspectionsPanel({ propertyId, canCreate }: { propertyId: string; canCreate: boolean }) {
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitFilter, setUnitFilter] = useState(UNIT_FILTER_ALL);

  useEffect(() => {
    fetch(`/api/inspections?propertyId=${propertyId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setInspections(data.inspections ?? []);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  // UNIT-OPS-1: server-scoped rows → only the viewer's Units in the filter.
  const unitFilterOptions = useMemo(() => buildUnitFilterOptions(inspections), [inspections]);
  const showUnits = inspections.some((inspection) => inspection.propertyUnitId !== null);
  const visibleInspections = inspections.filter((inspection) => matchesUnitFilter(inspection, unitFilter));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <UnitFilterSelect id="property-inspections-unit-filter" options={unitFilterOptions} value={unitFilter} onChange={setUnitFilter} />
      {canCreate ? (
        <Link href={`/inspections/new?propertyId=${propertyId}`} className="button button-primary" style={{ alignSelf: "flex-start" }}>
          New Inspection
        </Link>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : inspections.length === 0 ? (
        <p className="muted">No inspections for this property yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {visibleInspections.map((inspection) => (
            <li key={inspection.id}>
              <Link href={`/inspections/${inspection.id}`} className="card interactive-card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <div className="clickable-title" style={{ fontWeight: 600 }}>{inspection.templateName}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {INSPECTION_STATUS_LABELS[inspection.status as InspectionStatus] ?? inspection.status}
                    {inspection.overallResult
                      ? ` · ${INSPECTION_RESULT_LABELS[inspection.overallResult as InspectionResult] ?? inspection.overallResult}`
                      : ""}
                  </div>
                  {showUnits ? (
                    <div style={{ fontSize: "0.85rem", overflowWrap: "anywhere" }}>{formatRecordUnitLabel(inspection)}</div>
                  ) : null}
                </div>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  {inspection.scheduledDate ? `Scheduled ${inspection.scheduledDate}` : new Date(inspection.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
