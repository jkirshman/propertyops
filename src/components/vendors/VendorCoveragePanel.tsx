"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { VENDOR_COVERAGE_MODE_LABELS, type VendorCoverageMode } from "@/lib/vendors/constants";

interface OptionRecord {
  id: string;
  name: string;
}

interface CoverageRow {
  id: string;
  propertyId: string;
  propertyName: string;
}

export function VendorCoveragePanel({
  vendorId,
  coverageMode,
  canManage,
}: {
  vendorId: string;
  coverageMode: string;
  canManage: boolean;
}) {
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}/coverage`);
      if (response.ok) {
        const data = await response.json();
        setCoverage(data.coverage ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/properties?active=true")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
  }, []);

  async function addCoverage() {
    if (!selectedPropertyId) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/vendors/${vendorId}/coverage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: selectedPropertyId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Could not add coverage.");
        return;
      }
      setSelectedPropertyId("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeCoverage(propertyId: string) {
    await fetch(`/api/vendors/${vendorId}/coverage/${propertyId}`, { method: "DELETE" });
    await load();
  }

  const uncoveredProperties = properties.filter(
    (property) => !coverage.some((row) => row.propertyId === property.id),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p className="muted" style={{ fontSize: "0.9rem" }}>
        Coverage mode: <strong>{VENDOR_COVERAGE_MODE_LABELS[coverageMode as VendorCoverageMode] ?? coverageMode}</strong>
        {coverageMode === "all" ? " — this vendor can service every property in the organization." : ""}
      </p>

      {coverageMode === "specific" ? (
        <>
          {canManage ? (
            <div className="card" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              {error ? <p className="error-text" style={{ width: "100%" }}>{error}</p> : null}
              <div>
                <label className="label" htmlFor="vendor-coverage-property">
                  Add property coverage
                </label>
                <select
                  id="vendor-coverage-property"
                  className="input"
                  value={selectedPropertyId}
                  onChange={(event) => setSelectedPropertyId(event.target.value)}
                >
                  <option value="">Select a property…</option>
                  {uncoveredProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="button button-primary" onClick={addCoverage} disabled={submitting || !selectedPropertyId}>
                Add
              </button>
            </div>
          ) : null}

          {loading ? (
            <p className="muted">Loading…</p>
          ) : coverage.length === 0 ? (
            <p className="muted">No specific property coverage configured yet.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {coverage.map((row) => (
                <li key={row.id} className="card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <Link href={`/properties/${row.propertyId}`}>{row.propertyName}</Link>
                  {canManage ? (
                    <button type="button" className="button" onClick={() => removeCoverage(row.propertyId)}>
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
