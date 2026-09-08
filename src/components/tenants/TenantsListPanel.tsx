"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { TENANT_TYPES, TENANT_TYPE_LABELS, type TenantType } from "@/lib/tenants/constants";

interface TenantRow {
  id: string;
  tenantType: string;
  name: string;
  isActive: boolean;
  primaryPhone: string | null;
  primaryEmail: string | null;
}

interface OptionRecord {
  id: string;
  name: string;
}

export function TenantsListPanel({ canCreate }: { canCreate: boolean }) {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("true");
  const [tenantType, setTenantType] = useState("");
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    fetch("/api/properties?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (active) params.set("active", active);
    if (tenantType) params.set("tenantType", tenantType);
    if (propertyId) params.set("propertyId", propertyId);

    return fetch(`/api/tenants?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setTenants(data.tenants ?? []);
      });
  }, [search, active, tenantType, propertyId]);

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
            placeholder="Search tenants…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="input" style={{ maxWidth: 150 }} value={active} onChange={(event) => setActive(event.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="">All</option>
          </select>
          <select className="input" style={{ maxWidth: 190 }} value={tenantType} onChange={(event) => setTenantType(event.target.value)}>
            <option value="">All types</option>
            {TENANT_TYPES.map((type) => (
              <option key={type} value={type}>
                {TENANT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 200 }} value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
            <option value="">Any property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/leases" className="button">
            View all leases
          </Link>
          {canCreate ? (
            <Link href="/tenants/new" className="button button-primary">
              New Tenant
            </Link>
          ) : null}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : tenants.length === 0 ? (
          <p className="muted">
            No tenants match your filters yet.{" "}
            {canCreate ? <Link href="/tenants/new">Add the first one.</Link> : null}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.5rem" }}>Tenant</th>
                  <th style={{ padding: "0.5rem" }}>Type</th>
                  <th style={{ padding: "0.5rem" }}>Phone / Email</th>
                  <th style={{ padding: "0.5rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem" }}>
                      <Link href={`/tenants/${tenant.id}`}>{tenant.name}</Link>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {TENANT_TYPE_LABELS[tenant.tenantType as TenantType] ?? tenant.tenantType}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {[tenant.primaryPhone, tenant.primaryEmail].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{tenant.isActive ? "Active" : "Inactive"}</td>
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
