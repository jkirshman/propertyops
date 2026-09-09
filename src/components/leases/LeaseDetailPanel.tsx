"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { daysUntil, isDateApproaching, isLeaseExpired, isLeaseExpiringWithin } from "@/lib/leases/alerts";
import {
  LEASE_EFFECTIVE_STATUS_LABELS,
  LEASE_STATUSES,
  LEASE_STATUS_LABELS,
  LEASE_TYPE_LABELS,
  RENT_FREQUENCY_LABELS,
  type LeaseStatus,
  type LeaseType,
  type RentFrequency,
} from "@/lib/leases/constants";
import { getEffectiveLeaseStatus } from "@/lib/leases/status";

import { LeaseActivityPanel } from "./LeaseActivityPanel";
import { LeaseDocumentsPanel } from "./LeaseDocumentsPanel";

export interface LeaseRecord {
  id: string;
  propertyId: string;
  tenantId: string;
  label: string;
  leaseType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  noticeDate: string | null;
  renewalOptionDate: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  securityDeposit: number | null;
  baseRent: number | null;
  rentFrequency: string | null;
  squareFootageLeased: number | null;
  unitLabel: string | null;
  propertyUnitId: string | null;
  notes: string | null;
}

interface WorkOrderRow {
  id: string;
  number: string;
  subject: string;
  status: string;
}

const TABS = ["overview", "work-orders", "documents", "activity"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  "work-orders": "Property Work Orders",
  documents: "Documents",
  activity: "Activity",
};

export function LeaseDetailPanel({
  initialLease,
  propertyName,
  tenantName,
  unitRecordLabel,
  canEdit,
  canManageStatus,
  canManageDocuments,
}: {
  initialLease: LeaseRecord;
  propertyName: string;
  tenantName: string;
  // The linked property_units row's label, resolved server-side — preferred
  // for display over the legacy free-text unitLabel when both exist, per
  // POLISH-2's backward-compatibility rule (never overwrite unitLabel itself).
  unitRecordLabel?: string | null;
  canEdit: boolean;
  canManageStatus: boolean;
  canManageDocuments: boolean;
}) {
  const [lease, setLease] = useState(initialLease);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true);

  useEffect(() => {
    fetch(`/api/work-orders?propertyId=${lease.propertyId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setWorkOrders(data.workOrders ?? []);
      })
      .finally(() => setLoadingWorkOrders(false));
  }, [lease.propertyId]);

  async function changeStatus(status: LeaseStatus) {
    setError(null);
    setBusy(true);
    const response = await fetch(`/api/leases/${lease.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(data?.error ?? "Could not update the lease status.");
      return;
    }
    setLease(data.lease);
  }

  const effectiveStatus = getEffectiveLeaseStatus(lease.status as LeaseStatus, lease.startDate, lease.endDate);

  const alerts: string[] = [];
  if (lease.endDate && isLeaseExpired(lease.endDate)) {
    alerts.push(`Expired ${lease.endDate}`);
  } else if (lease.endDate) {
    for (const threshold of [90, 60, 30]) {
      if (isLeaseExpiringWithin(lease.endDate, threshold)) {
        alerts.push(`Expires in ${daysUntil(lease.endDate)} days (${lease.endDate})`);
        break;
      }
    }
  }
  if (lease.noticeDate && isDateApproaching(lease.noticeDate, 30)) {
    alerts.push(`Notice date approaching (${lease.noticeDate})`);
  }
  if (lease.renewalOptionDate && isDateApproaching(lease.renewalOptionDate, 30)) {
    alerts.push(`Renewal option date approaching (${lease.renewalOptionDate})`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Effective status</div>
          <div style={{ fontWeight: 600 }}>{LEASE_EFFECTIVE_STATUS_LABELS[effectiveStatus]}</div>
        </div>
        {canManageStatus ? (
          <div>
            <label className="muted" style={{ fontSize: "0.8rem", display: "block" }}>Stored status</label>
            <select
              className="input"
              value={lease.status}
              disabled={busy}
              onChange={(event) => changeStatus(event.target.value as LeaseStatus)}
            >
              {LEASE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LEASE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {canEdit ? (
          <Link href={`/leases/${lease.id}/edit`} className="button" style={{ marginLeft: "auto" }}>
            Edit lease
          </Link>
        ) : null}
      </div>

      {alerts.length > 0 ? (
        <div className="card" style={{ borderColor: "var(--danger)", background: "var(--danger-bg)" }}>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {alerts.map((alert) => (
              <li key={alert} style={{ color: "var(--danger)", fontWeight: 600, fontSize: "0.9rem" }}>
                {alert}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            style={{
              padding: "0.6rem 0.9rem",
              background: "none",
              border: "none",
              borderBottom: tab === value ? "2px solid var(--brand)" : "2px solid transparent",
              fontWeight: tab === value ? 600 : 500,
              color: tab === value ? "var(--foreground)" : "var(--muted)",
              cursor: "pointer",
            }}
          >
            {TAB_LABELS[value]}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Property</div>
            <div><Link href={`/properties/${lease.propertyId}`}>{propertyName}</Link></div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Tenant</div>
            <div><Link href={`/tenants/${lease.tenantId}`}>{tenantName}</Link></div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Unit / suite</div>
            <div>{unitRecordLabel ?? lease.unitLabel ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Lease type</div>
            <div>{LEASE_TYPE_LABELS[lease.leaseType as LeaseType] ?? lease.leaseType}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Start / end</div>
            <div>{lease.startDate} – {lease.endDate ?? "Open"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Notice date</div>
            <div>{lease.noticeDate ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Renewal option date</div>
            <div>{lease.renewalOptionDate ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Move-in / move-out</div>
            <div>{lease.moveInDate ?? "Not set"} – {lease.moveOutDate ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Base rent</div>
            <div>
              {lease.baseRent != null ? `$${lease.baseRent.toLocaleString()}` : "Not set"}
              {lease.rentFrequency ? ` / ${RENT_FREQUENCY_LABELS[lease.rentFrequency as RentFrequency] ?? lease.rentFrequency}` : ""}
            </div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Security deposit</div>
            <div>{lease.securityDeposit != null ? `$${lease.securityDeposit.toLocaleString()}` : "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Square footage leased</div>
            <div>{lease.squareFootageLeased ?? "Not set"}</div>
          </div>
          {lease.notes ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Notes</div>
              <p style={{ whiteSpace: "pre-wrap" }}>{lease.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "work-orders" ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link href={`/work-orders/new?propertyId=${lease.propertyId}`} className="button button-primary" style={{ alignSelf: "flex-start" }}>
            New Work Order for This Property
          </Link>
          {loadingWorkOrders ? (
            <p className="muted">Loading…</p>
          ) : workOrders.length === 0 ? (
            <p className="muted">No work orders for this property yet.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {workOrders.map((wo) => (
                <li key={wo.id}>
                  <Link href={`/work-orders/${wo.id}`} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{wo.number} · {wo.subject}</span>
                    <span className="muted">{wo.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "documents" ? <LeaseDocumentsPanel leaseId={lease.id} canManage={canManageDocuments} /> : null}
      {tab === "activity" ? <LeaseActivityPanel leaseId={lease.id} /> : null}
    </div>
  );
}
