"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

interface ServiceRecord {
  id: string;
  serviceDate: string;
  description: string;
  vendorId: string | null;
  cost: number | null;
  notes: string | null;
}

interface VendorOption {
  id: string;
  name: string;
}

const EMPTY_FORM = { serviceDate: "", description: "", vendorId: "", cost: "", notes: "" };

export function PropertyComponentServiceHistoryPanel({
  propertyComponentId,
  canManage,
}: {
  propertyComponentId: string;
  canManage: boolean;
}) {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/property-components/${propertyComponentId}/service-records`);
      if (response.ok) setRecords((await response.json()).serviceRecords ?? []);
    } finally {
      setLoading(false);
    }
  }, [propertyComponentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/vendors?active=true")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setVendors(data.vendors ?? []));
  }, []);

  const vendorNameById = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.serviceDate) {
      setError("Enter a service date.");
      return;
    }
    if (!form.description.trim()) {
      setError("Enter a description.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/property-components/${propertyComponentId}/service-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: form.serviceDate,
          description: form.description,
          vendorId: form.vendorId || undefined,
          cost: form.cost ? Number(form.cost) : undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not save the service record.");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canManage ? (
        <div>
          <button type="button" className="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? "Cancel" : "+ Add service record"}
          </button>
          {showForm ? (
            <form onSubmit={handleSubmit} className="card" style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {error ? <p className="error-text">{error}</p> : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
                <div>
                  <label className="label" htmlFor="cs-date">Service date</label>
                  <input
                    id="cs-date"
                    type="date"
                    className="input"
                    value={form.serviceDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, serviceDate: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="cs-vendor">Vendor (optional)</label>
                  <select
                    id="cs-vendor"
                    className="input"
                    value={form.vendorId}
                    onChange={(event) => setForm((prev) => ({ ...prev, vendorId: event.target.value }))}
                  >
                    <option value="">None</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="cs-cost">Cost (optional)</label>
                  <input
                    id="cs-cost"
                    type="number"
                    min={0}
                    step="0.01"
                    className="input"
                    value={form.cost}
                    onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="cs-description">Description</label>
                <input
                  id="cs-description"
                  className="input"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="cs-notes">Notes (optional)</label>
                <textarea
                  id="cs-notes"
                  className="input"
                  rows={2}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
              <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
                {submitting ? "Saving…" : "Save service record"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : records.length === 0 ? (
        <p className="muted">No service history recorded yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {records.map((record) => (
            <li key={record.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{record.description}</div>
                  {record.vendorId || record.cost != null ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {record.vendorId ? (
                        <Link href={`/vendors/${record.vendorId}`}>{vendorNameById.get(record.vendorId) ?? "Vendor"}</Link>
                      ) : null}
                      {record.cost != null ? ` · $${record.cost}` : ""}
                    </div>
                  ) : null}
                  {record.notes ? <div className="muted" style={{ fontSize: "0.85rem" }}>{record.notes}</div> : null}
                </div>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {new Date(record.serviceDate).toLocaleDateString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
