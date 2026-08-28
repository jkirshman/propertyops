"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface AssetRow {
  id: string;
  assetTag: string;
  displayName: string;
}

export function PropertyAssetsPanel({ propertyId, canAssign }: { propertyId: string; canAssign: boolean }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [currentRes, availableRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}/assets`),
        fetch("/api/assets?assignmentType=unassigned&active=true"),
      ]);
      if (currentRes.ok) {
        const data = await currentRes.json();
        setAssets(data.assets ?? []);
      }
      if (availableRes.ok) {
        const data = await availableRes.json();
        setAvailableAssets(data.assets ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign() {
    setError(null);
    if (!selectedAssetId) {
      setError("Select an asset.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/assets/${selectedAssetId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "property", propertyId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Could not assign the asset.");
        return;
      }
      setSelectedAssetId("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn(assetId: string) {
    await fetch(`/api/assets/${assetId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "unassigned" }),
    });
    await load();
  }

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      {canAssign ? (
        <div className="card" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="label" htmlFor="assign-asset-to-property">
              Assign asset to this property
            </label>
            <select
              id="assign-asset-to-property"
              className="input"
              value={selectedAssetId}
              onChange={(event) => setSelectedAssetId(event.target.value)}
            >
              <option value="">Select an unassigned asset…</option>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} · {asset.displayName}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="button button-primary" onClick={handleAssign} disabled={submitting}>
            {submitting ? "Assigning…" : "Assign"}
          </button>
        </div>
      ) : null}

      {assets.length === 0 ? (
        <p className="muted">No assets are currently assigned to this property.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {assets.map((asset) => (
            <li key={asset.id} className="card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <Link href={`/assets/${asset.id}`} style={{ fontWeight: 600 }}>
                {asset.assetTag} · {asset.displayName}
              </Link>
              {canAssign ? (
                <button type="button" className="button" onClick={() => handleReturn(asset.id)}>
                  Return to unassigned
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
