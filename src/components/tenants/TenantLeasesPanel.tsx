"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LEASE_EFFECTIVE_STATUS_LABELS } from "@/lib/leases/constants";
import { getEffectiveLeaseStatus } from "@/lib/leases/status";

interface OptionRecord {
  id: string;
  name: string;
}

interface LeaseRow {
  id: string;
  label: string;
  propertyId: string;
  unitLabel: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
}

export function TenantLeasesPanel({ tenantId, canCreate }: { tenantId: string; canCreate: boolean }) {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [properties, setProperties] = useState<OptionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leases?tenantId=${tenantId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setLeases(data.leases ?? []);
      })
      .finally(() => setLoading(false));
    fetch("/api/properties?active=true")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setProperties(data.properties ?? []));
  }, [tenantId]);

  const propertyNameById = new Map(properties.map((property) => [property.id, property.name]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canCreate ? (
        <Link href={`/leases/new?tenantId=${tenantId}`} className="button button-primary" style={{ alignSelf: "flex-start" }}>
          New Lease
        </Link>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : leases.length === 0 ? (
        <p className="muted">No leases for this tenant yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {leases.map((lease) => {
            const effectiveStatus = getEffectiveLeaseStatus(
              lease.status as Parameters<typeof getEffectiveLeaseStatus>[0],
              lease.startDate,
              lease.endDate,
            );
            return (
              <li key={lease.id} className="card">
                <Link href={`/leases/${lease.id}`} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{lease.label}</div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {propertyNameById.get(lease.propertyId) ?? "Unknown property"}
                      {lease.unitLabel ? ` · Unit ${lease.unitLabel}` : ""}
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem", textAlign: "right" }}>
                    <div>{LEASE_EFFECTIVE_STATUS_LABELS[effectiveStatus]}</div>
                    <div>
                      {lease.startDate} – {lease.endDate ?? "Open"}
                    </div>
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
