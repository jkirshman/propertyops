"use client";

import Link from "next/link";
import { useState } from "react";

import {
  VENDOR_COMPLIANCE_STATUS_LABELS,
  classifyComplianceStatus,
  type VendorComplianceStatus,
} from "@/lib/vendors/compliance";

import { VendorActivityPanel } from "./VendorActivityPanel";
import { VendorContactsPanel } from "./VendorContactsPanel";
import { VendorCoveragePanel } from "./VendorCoveragePanel";
import { VendorDocumentsPanel } from "./VendorDocumentsPanel";
import { VendorServiceHistoryPanel } from "./VendorServiceHistoryPanel";
import { VendorWorkOrdersPanel } from "./VendorWorkOrdersPanel";

export interface VendorRecord {
  id: string;
  name: string;
  legalName: string | null;
  isActive: boolean;
  isPreferred: boolean;
  primaryPhone: string | null;
  primaryEmail: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  accountNumber: string | null;
  notes: string | null;
  coverageMode: string;
  insuranceExpiresAt: string | null;
  licenseExpiresAt: string | null;
  contractExpiresAt: string | null;
  categories: { id: string; name: string }[];
}

const TABS = ["overview", "contacts", "coverage", "workorders", "service", "documents", "activity"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  contacts: "Contacts",
  coverage: "Properties / Coverage",
  workorders: "Work Orders",
  service: "Service History",
  documents: "Documents",
  activity: "Activity",
};

const COMPLIANCE_BADGE_STYLE: Record<VendorComplianceStatus, { background: string; color: string }> = {
  none: { background: "var(--surface)", color: "var(--muted)" },
  ok: { background: "#dcfce7", color: "#166534" },
  expiring_soon: { background: "#fef3c7", color: "#92400e" },
  expired: { background: "#fee2e2", color: "#991b1b" },
};

function ComplianceBadge({ label, expiresAt }: { label: string; expiresAt: string | null }) {
  const status = classifyComplianceStatus(expiresAt);
  return (
    <div>
      <div className="muted" style={{ fontSize: "0.8rem" }}>{label}</div>
      <div>
        {expiresAt ?? "Not on file"}{" "}
        <span
          style={{
            display: "inline-block",
            padding: "0.1rem 0.4rem",
            borderRadius: 999,
            fontSize: "0.7rem",
            fontWeight: 600,
            ...COMPLIANCE_BADGE_STYLE[status],
          }}
        >
          {VENDOR_COMPLIANCE_STATUS_LABELS[status]}
        </span>
      </div>
    </div>
  );
}

export function VendorDetailPanel({
  initialVendor,
  canEdit,
  canManageContacts,
  canManageCoverage,
  canManageDocuments,
}: {
  initialVendor: VendorRecord;
  canEdit: boolean;
  canManageContacts: boolean;
  canManageCoverage: boolean;
  canManageDocuments: boolean;
}) {
  const [vendor, setVendor] = useState(initialVendor);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function patch(fields: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    const response = await fetch(`/api/vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(data?.error ?? "Could not save the change.");
      return null;
    }
    setVendor(data.vendor);
    return data.vendor;
  }

  const address = [vendor.addressLine1, vendor.addressLine2, vendor.city, vendor.state, vendor.postalCode, vendor.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {canEdit ? (
          <>
            <button type="button" className="button" onClick={() => patch({ isActive: !vendor.isActive })} disabled={busy}>
              {vendor.isActive ? "Deactivate vendor" : "Activate vendor"}
            </button>
            <button type="button" className="button" onClick={() => patch({ isPreferred: !vendor.isPreferred })} disabled={busy}>
              {vendor.isPreferred ? "Unmark preferred" : "Mark preferred"}
            </button>
            <Link href={`/vendors/${vendor.id}/edit`} className="button">
              Edit vendor
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
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
            <div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Legal / business name</div>
              <div>{vendor.legalName ?? "Not set"}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Phone / Email</div>
              <div>{[vendor.primaryPhone, vendor.primaryEmail].filter(Boolean).join(" · ") || "Not set"}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Website</div>
              <div>{vendor.website ?? "Not set"}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Address</div>
              <div>{address || "Not set"}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Account / reference number</div>
              <div>{vendor.accountNumber ?? "Not set"}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Services</div>
              <div>{vendor.categories.length > 0 ? vendor.categories.map((c) => c.name).join(", ") : "None assigned"}</div>
            </div>
          </div>

          <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
            <ComplianceBadge label="Insurance expiration" expiresAt={vendor.insuranceExpiresAt} />
            <ComplianceBadge label="License expiration" expiresAt={vendor.licenseExpiresAt} />
            <ComplianceBadge label="Contract expiration" expiresAt={vendor.contractExpiresAt} />
          </div>

          {vendor.notes ? (
            <div className="card">
              <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>Notes</div>
              <p style={{ whiteSpace: "pre-wrap" }}>{vendor.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "contacts" ? <VendorContactsPanel vendorId={vendor.id} canManage={canManageContacts} /> : null}
      {tab === "coverage" ? (
        <VendorCoveragePanel vendorId={vendor.id} coverageMode={vendor.coverageMode} canManage={canManageCoverage} />
      ) : null}
      {tab === "workorders" ? <VendorWorkOrdersPanel vendorId={vendor.id} /> : null}
      {tab === "service" ? <VendorServiceHistoryPanel vendorId={vendor.id} /> : null}
      {tab === "documents" ? <VendorDocumentsPanel vendorId={vendor.id} canManage={canManageDocuments} /> : null}
      {tab === "activity" ? <VendorActivityPanel vendorId={vendor.id} /> : null}
    </div>
  );
}
