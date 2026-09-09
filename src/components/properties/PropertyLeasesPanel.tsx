"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LEASE_EFFECTIVE_STATUS_LABELS, type LeaseStatus } from "@/lib/leases/constants";
import { getEffectiveLeaseStatus } from "@/lib/leases/status";

interface LeaseRow {
  id: string;
  label: string;
  tenantId: string;
  unitLabel: string | null;
  propertyUnitId: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  noticeDate: string | null;
  renewalOptionDate: string | null;
}

interface TenantOption {
  id: string;
  name: string;
}

export function PropertyLeasesPanel({ propertyId, canCreate }: { propertyId: string; canCreate: boolean }) {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [unitLabelById, setUnitLabelById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leases?propertyId=${propertyId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setLeases(data.leases ?? []);
      })
      .finally(() => setLoading(false));
    fetch("/api/tenants?active=true")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setTenants(data.tenants ?? []));
    fetch(`/api/properties/${propertyId}/units`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setUnitLabelById(new Map((data.units ?? []).map((u: { id: string; unitLabel: string }) => [u.id, u.unitLabel])));
      });
  }, [propertyId]);

  const tenantNameById = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canCreate ? (
        <Link href={`/leases/new?propertyId=${propertyId}`} className="button button-primary" style={{ alignSelf: "flex-start" }}>
          New Lease
        </Link>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : leases.length === 0 ? (
        <p className="muted">No leases for this property yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {leases.map((lease) => {
            const effectiveStatus = getEffectiveLeaseStatus(
              lease.status as LeaseStatus,
              lease.startDate,
              lease.endDate,
            );
            return (
              <li key={lease.id} className="card">
                <Link href={`/leases/${lease.id}`} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {lease.label}
                      {(() => {
                        const unit = (lease.propertyUnitId && unitLabelById.get(lease.propertyUnitId)) || lease.unitLabel;
                        return unit ? ` · Unit ${unit}` : "";
                      })()}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {tenantNameById.get(lease.tenantId) ?? "Unknown tenant"}
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem", textAlign: "right" }}>
                    <div>{LEASE_EFFECTIVE_STATUS_LABELS[effectiveStatus]}</div>
                    <div>{lease.startDate} – {lease.endDate ?? "Open"}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
