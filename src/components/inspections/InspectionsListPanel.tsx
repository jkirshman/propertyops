"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_STATUSES,
  INSPECTION_STATUS_LABELS,
  type InspectionResult,
  type InspectionStatus,
} from "@/lib/inspections/constants";

interface OptionRecord {
  id: string;
  name: string;
}

interface InspectionRow {
  id: string;
  templateName: string;
  propertyId: string;
  propertyEquipmentId: string | null;
  status: string;
  overallResult: string | null;
  inspectorUserId: string | null;
  scheduledDate: string | null;
  updatedAt: string;
}

export function InspectionsListPanel({
  canCreate,
  initialPropertyId,
}: {
  canCreate: boolean;
  initialPropertyId?: string;
}) {
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? "");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/properties?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUsers(data.users ?? []));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (propertyId) params.set("propertyId", propertyId);
    if (status) params.set("status", status);

    return fetch(`/api/inspections?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setInspections(data.inspections ?? []);
      });
  }, [propertyId, status]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [load]);

  const propertyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of properties) map.set(property.id, property.name);
    return map;
  }, [properties]);

  const inspectorNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of users) map.set(user.id, user.displayName);
    return map;
  }, [users]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
          <select className="input" style={{ maxWidth: 200 }} value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
            <option value="">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 170 }} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {INSPECTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {INSPECTION_STATUS_LABELS[value as InspectionStatus]}
              </option>
            ))}
          </select>
        </div>
        {canCreate ? (
          <Link
            href={initialPropertyId ? `/inspections/new?propertyId=${initialPropertyId}` : "/inspections/new"}
            className="button button-primary"
          >
            New Inspection
          </Link>
        ) : null}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : inspections.length === 0 ? (
          <p className="muted">
            No inspections match your filters yet.{" "}
            {canCreate ? <Link href="/inspections/new">Start one.</Link> : null}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.5rem" }}>Inspection</th>
                  <th style={{ padding: "0.5rem" }}>Property</th>
                  <th style={{ padding: "0.5rem" }}>Status</th>
                  <th style={{ padding: "0.5rem" }}>Result</th>
                  <th style={{ padding: "0.5rem" }}>Inspector</th>
                  <th style={{ padding: "0.5rem" }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((inspection) => (
                  <tr key={inspection.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem" }}>
                      <Link href={`/inspections/${inspection.id}`}>{inspection.templateName}</Link>
                    </td>
                    <td style={{ padding: "0.5rem" }}>{propertyNameById.get(inspection.propertyId) ?? "—"}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {INSPECTION_STATUS_LABELS[inspection.status as InspectionStatus] ?? inspection.status}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {inspection.overallResult
                        ? INSPECTION_RESULT_LABELS[inspection.overallResult as InspectionResult] ?? inspection.overallResult
                        : "—"}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {inspection.inspectorUserId ? inspectorNameById.get(inspection.inspectorUserId) ?? "—" : "Unassigned"}
                    </td>
                    <td className="muted" style={{ padding: "0.5rem" }}>
                      {new Date(inspection.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
