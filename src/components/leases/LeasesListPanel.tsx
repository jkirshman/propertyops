"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  LEASE_EFFECTIVE_STATUSES,
  LEASE_EFFECTIVE_STATUS_LABELS,
  LEASE_STATUSES,
  LEASE_STATUS_LABELS,
  type LeaseEffectiveStatus,
  type LeaseStatus,
} from "@/lib/leases/constants";
import { getEffectiveLeaseStatus } from "@/lib/leases/status";

interface OptionRecord {
  id: string;
  name: string;
}

interface LeaseRow {
  id: string;
  label: string;
  propertyId: string;
  tenantId: string;
  unitLabel: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
}

export function LeasesListPanel({
  canCreate,
  initialPropertyId,
  initialTenantId,
}: {
  canCreate: boolean;
  initialPropertyId?: string;
  initialTenantId?: string;
}) {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [tenants, setTenants] = useState<OptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? "");
  const [tenantId, setTenantId] = useState(initialTenantId ?? "");
  const [status, setStatus] = useState("");
  const [effectiveFilter, setEffectiveFilter] = useState("");

  useEffect(() => {
    fetch("/api/properties?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
    fetch("/api/tenants?active=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setTenants(data.tenants ?? []));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (propertyId) params.set("propertyId", propertyId);
    if (tenantId) params.set("tenantId", tenantId);
    if (status) params.set("status", status);

    return fetch(`/api/leases?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setLeases(data.leases ?? []);
      });
  }, [propertyId, tenantId, status]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [load]);

  const propertyNameById = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);
  const tenantNameById = useMemo(() => new Map(tenants.map((t) => [t.id, t.name])), [tenants]);

  const visibleLeases = useMemo(() => {
    if (!effectiveFilter) return leases;
    return leases.filter(
      (lease) =>
        getEffectiveLeaseStatus(lease.status as LeaseStatus, lease.startDate, lease.endDate) === effectiveFilter,
    );
  }, [leases, effectiveFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
          <select className="input" style={{ maxWidth: 190 }} value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
            <option value="">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 190 }} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
            <option value="">All tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 170 }} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All stored statuses</option>
            {LEASE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LEASE_STATUS_LABELS[value as LeaseStatus]}
              </option>
            ))}
          </select>
          <select className="input" style={{ maxWidth: 170 }} value={effectiveFilter} onChange={(event) => setEffectiveFilter(event.target.value)}>
            <option value="">Any expiration state</option>
            {LEASE_EFFECTIVE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LEASE_EFFECTIVE_STATUS_LABELS[value as LeaseEffectiveStatus]}
              </option>
            ))}
          </select>
        </div>
        {canCreate ? (
          <Link href="/leases/new" className="button button-primary">
            New Lease
          </Link>
        ) : null}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : visibleLeases.length === 0 ? (
          <p className="muted">
            No leases match your filters yet. {canCreate ? <Link href="/leases/new">Create one.</Link> : null}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.5rem" }}>Lease</th>
                  <th style={{ padding: "0.5rem" }}>Tenant</th>
                  <th style={{ padding: "0.5rem" }}>Property</th>
                  <th style={{ padding: "0.5rem" }}>Unit</th>
                  <th style={{ padding: "0.5rem" }}>Start</th>
                  <th style={{ padding: "0.5rem" }}>End</th>
                  <th style={{ padding: "0.5rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeases.map((lease) => {
                  const effectiveStatus = getEffectiveLeaseStatus(
                    lease.status as LeaseStatus,
                    lease.startDate,
                    lease.endDate,
                  );
                  return (
                    <tr key={lease.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.5rem" }}>
                        <Link href={`/leases/${lease.id}`}>{lease.label}</Link>
                      </td>
                      <td style={{ padding: "0.5rem" }}>{tenantNameById.get(lease.tenantId) ?? "—"}</td>
                      <td style={{ padding: "0.5rem" }}>{propertyNameById.get(lease.propertyId) ?? "—"}</td>
                      <td style={{ padding: "0.5rem" }}>{lease.unitLabel ?? "—"}</td>
                      <td style={{ padding: "0.5rem" }}>{lease.startDate}</td>
                      <td style={{ padding: "0.5rem" }}>{lease.endDate ?? "Open"}</td>
                      <td style={{ padding: "0.5rem" }}>{LEASE_EFFECTIVE_STATUS_LABELS[effectiveStatus]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
