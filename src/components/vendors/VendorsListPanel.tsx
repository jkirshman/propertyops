"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface OptionRecord {
  id: string;
  name: string;
}

interface VendorRow {
  id: string;
  name: string;
  isActive: boolean;
  isPreferred: boolean;
  primaryPhone: string | null;
  primaryEmail: string | null;
  categories: { id: string; name: string }[];
}

export function VendorsListPanel({ canCreate }: { canCreate: boolean }) {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [categories, setCategories] = useState<OptionRecord[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("true");
  const [preferred, setPreferred] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    fetch("/api/vendor-categories?activeOnly=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setCategories(data.categories ?? []));
    fetch("/api/properties?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (active) params.set("active", active);
    if (preferred) params.set("preferred", preferred);
    if (categoryId) params.set("categoryId", categoryId);
    if (propertyId) params.set("propertyId", propertyId);

    return fetch(`/api/vendors?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setVendors(data.vendors ?? []);
      });
  }, [search, active, preferred, categoryId, propertyId]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            placeholder="Search vendors…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="input" style={{ maxWidth: 150 }} value={active} onChange={(event) => setActive(event.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="">All</option>
          </select>
          <select className="input" style={{ maxWidth: 150 }} value={preferred} onChange={(event) => setPreferred(event.target.value)}>
            <option value="">Any</option>
            <option value="true">Preferred only</option>
          </select>
          <select className="input" style={{ maxWidth: 190 }} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">All services</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 190 }} value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
            <option value="">Any property coverage</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
        {canCreate ? (
          <Link href="/vendors/new" className="button button-primary">
            New Vendor
          </Link>
        ) : null}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : vendors.length === 0 ? (
          <p className="muted">
            No vendors match your filters yet.{" "}
            {canCreate ? <Link href="/vendors/new">Add the first one.</Link> : null}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.5rem" }}>Vendor</th>
                  <th style={{ padding: "0.5rem" }}>Services</th>
                  <th style={{ padding: "0.5rem" }}>Phone / Email</th>
                  <th style={{ padding: "0.5rem" }}>Preferred</th>
                  <th style={{ padding: "0.5rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem" }}>
                      <Link href={`/vendors/${vendor.id}`}>{vendor.name}</Link>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {vendor.categories.length > 0
                        ? vendor.categories.map((category) => category.name).join(", ")
                        : "—"}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {[vendor.primaryPhone, vendor.primaryEmail].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{vendor.isPreferred ? "★ Preferred" : ""}</td>
                    <td style={{ padding: "0.5rem" }}>{vendor.isActive ? "Active" : "Inactive"}</td>
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
