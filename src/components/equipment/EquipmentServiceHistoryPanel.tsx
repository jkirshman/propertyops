"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  EQUIPMENT_SERVICE_TYPES,
  EQUIPMENT_SERVICE_TYPE_LABELS,
  type EquipmentServiceType,
} from "@/lib/equipment/constants";

interface ServiceRecord {
  id: string;
  serviceDate: string;
  serviceType: string;
  summary: string;
  vendorName: string | null;
  cost: number | null;
  notes: string | null;
}

const EMPTY_FORM = {
  serviceDate: "",
  serviceType: "preventive_maintenance" as EquipmentServiceType,
  summary: "",
  vendorName: "",
  cost: "",
  notes: "",
};

export function EquipmentServiceHistoryPanel({
  propertyEquipmentId,
  canManage,
}: {
  propertyEquipmentId: string;
  canManage: boolean;
}) {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/property-equipment/${propertyEquipmentId}/service-records`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.serviceRecords ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [propertyEquipmentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.serviceDate) {
      setError("Enter a service date.");
      return;
    }
    if (!form.summary.trim()) {
      setError("Enter a summary.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/property-equipment/${propertyEquipmentId}/service-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: form.serviceDate,
          serviceType: form.serviceType,
          summary: form.summary,
          vendorName: form.vendorName || undefined,
          cost: form.cost ? Number(form.cost) : undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not save the service record.");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch {
      setError("Could not reach the server.");
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
            <form
              onSubmit={handleSubmit}
              className="card"
              style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
            >
              {error ? <p className="error-text">{error}</p> : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
                <div>
                  <label className="label" htmlFor="service-date">
                    Service date
                  </label>
                  <input
                    id="service-date"
                    type="date"
                    className="input"
                    value={form.serviceDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, serviceDate: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="service-type">
                    Service type
                  </label>
                  <select
                    id="service-type"
                    className="input"
                    value={form.serviceType}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, serviceType: event.target.value as EquipmentServiceType }))
                    }
                  >
                    {EQUIPMENT_SERVICE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {EQUIPMENT_SERVICE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="service-vendor">
                    Vendor / provider
                  </label>
                  <input
                    id="service-vendor"
                    className="input"
                    value={form.vendorName}
                    onChange={(event) => setForm((prev) => ({ ...prev, vendorName: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="service-cost">
                    Cost (optional)
                  </label>
                  <input
                    id="service-cost"
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
                <label className="label" htmlFor="service-summary">
                  Summary
                </label>
                <input
                  id="service-summary"
                  className="input"
                  value={form.summary}
                  onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="service-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="service-notes"
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
                  <div style={{ fontWeight: 600 }}>
                    {EQUIPMENT_SERVICE_TYPE_LABELS[record.serviceType as EquipmentServiceType] ?? record.serviceType}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>{record.summary}</div>
                  {record.vendorName || record.cost != null ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {[record.vendorName, record.cost != null ? `$${record.cost}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
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
