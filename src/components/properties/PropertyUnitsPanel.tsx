"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { deriveUnitOccupancy } from "@/lib/property-units/occupancy";

interface UnitRecord {
  id: string;
  unitLabel: string;
  name: string | null;
  squareFootage: number | null;
  isActive: boolean;
  notes: string | null;
}

interface LeaseRecord {
  id: string;
  tenantId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  propertyUnitId: string | null;
}

interface TenantOption {
  id: string;
  name: string;
}

const EMPTY_FORM = { unitLabel: "", name: "", squareFootage: "", notes: "" };

export function PropertyUnitsPanel({
  propertyId,
  canCreate,
  canEdit,
}: {
  propertyId: string;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkCount, setBulkCount] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("Suite ");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [unitsRes, leasesRes, tenantsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}/units`),
        fetch(`/api/leases?propertyId=${propertyId}`),
        fetch("/api/tenants"),
      ]);
      if (unitsRes.ok) setUnits((await unitsRes.json()).units ?? []);
      if (leasesRes.ok) setLeases((await leasesRes.json()).leases ?? []);
      if (tenantsRes.ok) setTenants((await tenantsRes.json()).tenants ?? []);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const tenant of tenants) map.set(tenant.id, tenant.name);
    return map;
  }, [tenants]);

  const leasesByUnit = useMemo(() => {
    const map = new Map<string, LeaseRecord[]>();
    for (const lease of leases) {
      if (!lease.propertyUnitId) continue;
      const list = map.get(lease.propertyUnitId) ?? [];
      list.push(lease);
      map.set(lease.propertyUnitId, list);
    }
    return map;
  }, [leases]);

  async function createUnit(unitLabel: string, name: string, squareFootage: string) {
    return fetch(`/api/properties/${propertyId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitLabel,
        name: name || undefined,
        squareFootage: squareFootage || undefined,
      }),
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.unitLabel.trim()) {
      setError("Enter a unit label.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createUnit(form.unitLabel.trim(), form.name.trim(), form.squareFootage);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not create the unit.");
        return;
      }
      setForm(EMPTY_FORM);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkCreate() {
    const count = Number(bulkCount);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      setError("Enter a unit count between 1 and 100.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      for (let i = 1; i <= count; i += 1) {
        await createUnit(`${bulkPrefix}${i}`, "", "");
      }
      setBulkCount("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(unit: UnitRecord) {
    await fetch(`/api/properties/${propertyId}/units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !unit.isActive }),
    });
    await load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      {canCreate ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <form onSubmit={handleCreate} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
            <div>
              <label className="label" htmlFor="unit-label">Unit label</label>
              <input
                id="unit-label"
                className="input"
                value={form.unitLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, unitLabel: event.target.value }))}
                placeholder="e.g. Suite 100"
              />
            </div>
            <div>
              <label className="label" htmlFor="unit-name">Name (optional)</label>
              <input
                id="unit-name"
                className="input"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="unit-sqft">Square footage</label>
              <input
                id="unit-sqft"
                type="number"
                min={0}
                className="input"
                style={{ maxWidth: 140 }}
                value={form.squareFootage}
                onChange={(event) => setForm((prev) => ({ ...prev, squareFootage: event.target.value }))}
              />
            </div>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? "Adding…" : "Add unit"}
            </button>
          </form>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
            <div>
              <label className="label" htmlFor="bulk-prefix">Quick-add multiple: label prefix</label>
              <input
                id="bulk-prefix"
                className="input"
                style={{ maxWidth: 160 }}
                value={bulkPrefix}
                onChange={(event) => setBulkPrefix(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="bulk-count">How many units?</label>
              <input
                id="bulk-count"
                type="number"
                min={1}
                max={100}
                className="input"
                style={{ maxWidth: 100 }}
                value={bulkCount}
                onChange={(event) => setBulkCount(event.target.value)}
              />
            </div>
            <button type="button" className="button" disabled={submitting || !bulkCount} onClick={handleBulkCreate}>
              {submitting ? "Creating…" : "Create units"}
            </button>
            <p className="muted" style={{ fontSize: "0.8rem", flexBasis: "100%" }}>
              Creates real, individually editable unit records named &quot;{bulkPrefix}1&quot;, &quot;{bulkPrefix}2&quot;, etc. — not a stored count.
            </p>
          </div>
        </div>
      ) : null}

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : units.length === 0 ? (
          <p className="muted">No units/suites yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {units.map((unit) => {
              const occupancy = deriveUnitOccupancy(leasesByUnit.get(unit.id) ?? []);
              return (
                <li
                  key={unit.id}
                  style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", opacity: unit.isActive ? 1 : 0.6 }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {unit.unitLabel}
                      {unit.name ? ` · ${unit.name}` : ""}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {unit.squareFootage ? `${unit.squareFootage} sq ft · ` : ""}
                      {!unit.isActive ? "Inactive" : occupancy.occupied ? (
                        <>
                          Occupied — {tenantNameById.get(occupancy.tenantId ?? "") ?? "Tenant"}
                          {occupancy.leaseId ? (
                            <>
                              {" "}
                              (<Link href={`/leases/${occupancy.leaseId}`}>lease</Link>)
                            </>
                          ) : null}
                        </>
                      ) : (
                        "Vacant"
                      )}
                    </div>
                  </div>
                  {canEdit ? (
                    <button type="button" className="button" onClick={() => toggleActive(unit)}>
                      {unit.isActive ? "Deactivate" : "Activate"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
