"use client";

import { useState } from "react";

import { AssetActivityPanel } from "@/components/assets/AssetActivityPanel";
import { AssetAssignmentHistoryPanel } from "@/components/assets/AssetAssignmentHistoryPanel";
import { AssetAssignmentPanel, type AssetAssignmentSummary } from "@/components/assets/AssetAssignmentPanel";
import { AssetDocumentsPanel } from "@/components/assets/AssetDocumentsPanel";
import { AssetWorkOrdersPanel } from "@/components/assets/AssetWorkOrdersPanel";
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  type AssetCondition,
  type AssetStatus,
} from "@/lib/assets/constants";

export interface AssetRecord {
  id: string;
  assetTag: string;
  displayName: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  status: string;
  condition: string;
  isActive: boolean;
  acquiredDate: string | null;
  purchaseCost: number | null;
  warrantyExpiration: string | null;
  retiredDate: string | null;
  disposalReason: string | null;
  notes: string | null;
  assignmentType: string;
  assignedPersonId: string | null;
  assignedPropertyId: string | null;
}

const TABS = ["overview", "history", "workorders", "documents", "activity"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  history: "Assignment History",
  workorders: "Work Orders",
  documents: "Documents",
  activity: "Activity",
};

export function AssetDetailPanel({
  initialAsset,
  canEdit,
  canAssign,
  canRetire,
  canManageDocuments,
  canCreateWorkOrders,
}: {
  initialAsset: AssetRecord;
  canEdit: boolean;
  canAssign: boolean;
  canRetire: boolean;
  canManageDocuments: boolean;
  canCreateWorkOrders: boolean;
}) {
  const [asset, setAsset] = useState(initialAsset);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function patch(fields: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.message ?? "Could not save the change.");
      return null;
    }
    setAsset((prev) => ({ ...prev, ...data.asset }));
    return data.asset;
  }

  async function handleRetire() {
    setSaving(true);
    const response = await fetch(`/api/assets/${asset.id}/retire`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "retired" }),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    if (response.ok) {
      setAsset((prev) => ({ ...prev, ...data.asset }));
    } else {
      setError(data?.message ?? "Could not retire the asset.");
    }
  }

  async function handleReactivate() {
    setSaving(true);
    const response = await fetch(`/api/assets/${asset.id}/reactivate`, { method: "PATCH" });
    const data = await response.json().catch(() => null);
    setSaving(false);
    if (response.ok) {
      setAsset((prev) => ({ ...prev, ...data.asset }));
    } else {
      setError(data?.error ?? "Could not reactivate the asset.");
    }
  }

  function handleAssignmentChanged(updated: AssetAssignmentSummary) {
    setAsset((prev) => ({ ...prev, ...updated }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.9rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Status</div>
          <select
            className="input"
            value={asset.status}
            disabled={!canEdit}
            onChange={(event) => patch({ status: event.target.value })}
          >
            {ASSET_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ASSET_STATUS_LABELS[value as AssetStatus]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Condition</div>
          <select
            className="input"
            value={asset.condition}
            disabled={!canEdit}
            onChange={(event) => patch({ condition: event.target.value })}
          >
            {ASSET_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {ASSET_CONDITION_LABELS[value as AssetCondition]}
              </option>
            ))}
          </select>
        </div>
        {canRetire ? (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {asset.status === "retired" ? (
              <button type="button" className="button" onClick={handleReactivate} disabled={saving}>
                Reactivate
              </button>
            ) : asset.status === "disposed" ? null : (
              <button type="button" className="button" onClick={handleRetire} disabled={saving}>
                Retire asset
              </button>
            )}
          </div>
        ) : null}
      </div>

      <AssetAssignmentPanel
        assetId={asset.id}
        assignment={asset}
        canAssign={canAssign}
        onChanged={handleAssignmentChanged}
      />

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
            <div className="muted" style={{ fontSize: "0.8rem" }}>Manufacturer / model</div>
            <div>{[asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Serial number</div>
            <div>{asset.serialNumber ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Acquired date</div>
            <div>{asset.acquiredDate ?? "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Purchase cost</div>
            <div>{asset.purchaseCost != null ? `$${asset.purchaseCost}` : "Not set"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Warranty expiration</div>
            <div>{asset.warrantyExpiration ?? "Not set"}</div>
          </div>
          {asset.retiredDate ? (
            <div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Retired date</div>
              <div>{asset.retiredDate}</div>
            </div>
          ) : null}
          {asset.disposalReason ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Disposal reason</div>
              <div>{asset.disposalReason}</div>
            </div>
          ) : null}
          {asset.notes ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Notes</div>
              <p style={{ whiteSpace: "pre-wrap" }}>{asset.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "history" ? <AssetAssignmentHistoryPanel assetId={asset.id} /> : null}
      {tab === "workorders" ? (
        <AssetWorkOrdersPanel assetId={asset.id} canCreate={canCreateWorkOrders} />
      ) : null}
      {tab === "documents" ? <AssetDocumentsPanel assetId={asset.id} canManage={canManageDocuments} /> : null}
      {tab === "activity" ? <AssetActivityPanel assetId={asset.id} /> : null}
    </div>
  );
}
