"use client";

import { useCallback, useEffect, useState } from "react";

import { describeVendorApiError } from "@/lib/vendors/form-errors";

interface OptionRecord {
  id: string;
  name: string;
}

interface PendingVendor {
  id: string;
  name: string;
  primaryPhone: string | null;
  primaryEmail: string | null;
  submissionPropertyId: string | null;
  submissionNotes: string | null;
  categories: { id: string; name: string }[];
}

/** Visible only to reviewers (`vendor.approve`) — see VendorsPage. Approve/reject a pending vendor submission. */
export function VendorPendingApprovalsPanel() {
  const [pending, setPending] = useState<PendingVendor[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    return fetch("/api/vendor-requests")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => setPending(data?.vendors ?? []))
      .catch(() => setError("Could not load pending vendor requests."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    fetch("/api/properties?active=true")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
  }, [load]);

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/vendor-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reviewNotes: notesById[id] || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(describeVendorApiError(data?.error));
        return;
      }
      setNotesById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || pending.length === 0) {
    return null;
  }

  const propertyName = (id: string | null) => properties.find((property) => property.id === id)?.name ?? "—";

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <h2 style={{ fontSize: "1rem" }}>Pending vendor approvals ({pending.length})</h2>
      {error ? <p className="error-text">{error}</p> : null}
      {pending.map((vendor) => (
        <div key={vendor.id} style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
          <p style={{ fontWeight: 600, margin: 0 }}>{vendor.name}</p>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Property: {propertyName(vendor.submissionPropertyId)}
            {vendor.categories.length > 0 ? ` · ${vendor.categories.map((category) => category.name).join(", ")}` : ""}
          </p>
          {[vendor.primaryPhone, vendor.primaryEmail].some(Boolean) ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              {[vendor.primaryPhone, vendor.primaryEmail].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {vendor.submissionNotes ? <p style={{ fontSize: "0.85rem" }}>{vendor.submissionNotes}</p> : null}
          <textarea
            className="input"
            placeholder="Notes (optional, shown to submitter on reject)"
            rows={2}
            value={notesById[vendor.id] ?? ""}
            onChange={(event) =>
              setNotesById((prev) => ({ ...prev, [vendor.id]: event.target.value }))
            }
            style={{ marginTop: "0.5rem" }}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              className="button button-primary"
              disabled={busyId === vendor.id}
              onClick={() => decide(vendor.id, "approved")}
            >
              Approve
            </button>
            <button
              type="button"
              className="button"
              disabled={busyId === vendor.id}
              onClick={() => decide(vendor.id, "rejected")}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
