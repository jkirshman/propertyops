"use client";

import Link from "next/link";
import { useState } from "react";

import { TENANT_TYPE_LABELS, type TenantType } from "@/lib/tenants/constants";

import { TenantActivityPanel } from "./TenantActivityPanel";
import { TenantContactsPanel } from "./TenantContactsPanel";
import { TenantDocumentsPanel } from "./TenantDocumentsPanel";
import { TenantLeasesPanel } from "./TenantLeasesPanel";

export interface TenantRecord {
  id: string;
  tenantType: string;
  name: string;
  legalName: string | null;
  isActive: boolean;
  primaryPhone: string | null;
  primaryEmail: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
}

const TABS = ["overview", "contacts", "leases", "documents", "activity"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  contacts: "Contacts",
  leases: "Leases",
  documents: "Documents",
  activity: "Activity",
};

export function TenantDetailPanel({
  initialTenant,
  canEdit,
  canManageContacts,
  canManageDocuments,
  canCreateLeases,
}: {
  initialTenant: TenantRecord;
  canEdit: boolean;
  canManageContacts: boolean;
  canManageDocuments: boolean;
  canCreateLeases: boolean;
}) {
  const [tenant, setTenant] = useState(initialTenant);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setError(null);
    setBusy(true);
    const response = await fetch(`/api/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tenant.isActive }),
    });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(data?.error ?? "Could not update the tenant.");
      return;
    }
    setTenant(data.tenant);
  }

  const address = [tenant.addressLine1, tenant.addressLine2, tenant.city, tenant.state, tenant.postalCode, tenant.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {canEdit ? (
          <>
            <button type="button" className="button" onClick={toggleActive} disabled={busy}>
              {tenant.isActive ? "Deactivate tenant" : "Activate tenant"}
            </button>
            <Link href={`/tenants/${tenant.id}/edit`} className="button">
              Edit tenant
            </Link>
          </>
        ) : null}
      </div>

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
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Type</div>
            <div>{TENANT_TYPE_LABELS[tenant.tenantType as TenantType] ?? tenant.tenantType}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Legal name</div>
            <div>{tenant.legalName ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Phone / Email</div>
            <div>{[tenant.primaryPhone, tenant.primaryEmail].filter(Boolean).join(" · ") || "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Website</div>
            <div>{tenant.website ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Billing / mailing address</div>
            <div>{address || "Not set"}</div>
          </div>
          {tenant.notes ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Notes</div>
              <p style={{ whiteSpace: "pre-wrap" }}>{tenant.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "contacts" ? <TenantContactsPanel tenantId={tenant.id} canManage={canManageContacts} /> : null}
      {tab === "leases" ? <TenantLeasesPanel tenantId={tenant.id} canCreate={canCreateLeases} /> : null}
      {tab === "documents" ? <TenantDocumentsPanel tenantId={tenant.id} canManage={canManageDocuments} /> : null}
      {tab === "activity" ? <TenantActivityPanel tenantId={tenant.id} /> : null}
    </div>
  );
}
