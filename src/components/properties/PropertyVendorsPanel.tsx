"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface VendorRow {
  id: string;
  name: string;
  isPreferred: boolean;
  coverageMode: string;
  primaryPhone: string | null;
  primaryEmail: string | null;
  categories: { id: string; name: string }[];
}

interface VendorOption {
  id: string;
  name: string;
}

export function PropertyVendorsPanel({ propertyId, canManage }: { propertyId: string; canManage: boolean }) {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [allVendors, setAllVendors] = useState<VendorOption[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/vendors`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/vendors?active=true")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setAllVendors(data.vendors ?? []));
  }, []);

  async function addCoverage() {
    if (!selectedVendorId) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/vendors/${selectedVendorId}/coverage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Could not add this vendor to the property's coverage.");
        return;
      }
      setSelectedVendorId("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeCoverage(vendorId: string) {
    await fetch(`/api/vendors/${vendorId}/coverage/${propertyId}`, { method: "DELETE" });
    await load();
  }

  const addableVendors = allVendors.filter(
    (vendor) => !vendors.some((covered) => covered.id === vendor.id),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canManage ? (
        <div className="card" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          {error ? <p className="error-text" style={{ width: "100%" }}>{error}</p> : null}
          <div>
            <label className="label" htmlFor="property-vendor-add">
              Add vendor coverage for this property
            </label>
            <select
              id="property-vendor-add"
              className="input"
              value={selectedVendorId}
              onChange={(event) => setSelectedVendorId(event.target.value)}
            >
              <option value="">Select a vendor…</option>
              {addableVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="button button-primary" onClick={addCoverage} disabled={submitting || !selectedVendorId}>
            Add
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : vendors.length === 0 ? (
        <p className="muted">No vendors are approved for this property yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {vendors.map((vendor) => (
            <li key={vendor.id} className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  <Link href={`/vendors/${vendor.id}`}>{vendor.name}</Link>
                  {vendor.isPreferred ? " ★" : ""}
                </div>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {vendor.categories.map((category) => category.name).join(", ") || "No services assigned"}
                  {" · "}
                  {[vendor.primaryPhone, vendor.primaryEmail].filter(Boolean).join(" · ") || "No contact info"}
                </div>
              </div>
              {canManage && vendor.coverageMode === "specific" ? (
                <button type="button" className="button" onClick={() => removeCoverage(vendor.id)}>
                  Remove coverage
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
