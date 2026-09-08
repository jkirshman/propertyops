"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
}

export function PropertyInspectionsPanel({ propertyId, canCreate }: { propertyId: string; canCreate: boolean }) {
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inspections?propertyId=${propertyId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setInspections(data.inspections ?? []);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
          {inspections.map((inspection) => (
            <li key={inspection.id} className="card">
              <Link href={`/inspections/${inspection.id}`} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{inspection.templateName}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {INSPECTION_STATUS_LABELS[inspection.status as InspectionStatus] ?? inspection.status}
                    {inspection.overallResult
                      ? ` · ${INSPECTION_RESULT_LABELS[inspection.overallResult as InspectionResult] ?? inspection.overallResult}`
                      : ""}
                  </div>
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
