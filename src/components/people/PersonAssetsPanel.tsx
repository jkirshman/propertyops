"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface AssetRow {
  id: string;
  assetTag: string;
  displayName: string;
}

interface PropertyOption {
  id: string;
  name: string;
}

interface HistoryRecord {
  id: string;
  assetId: string;
  assignedAt: string;
  returnedAt: string | null;
  notes: string | null;
  returnNotes: string | null;
}

export function PersonAssetsPanel({
  personId,
  canOnboard,
  canOffboard,
}: {
  personId: string;
  canOnboard: boolean;
  canOffboard: boolean;
}) {
  const [currentAssets, setCurrentAssets] = useState<AssetRow[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AssetRow[]>([]);
  const [allAssets, setAllAssets] = useState<AssetRow[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-row offboard selection: assetId -> "unassigned" | propertyId
  const [returnTargets, setReturnTargets] = useState<Record<string, string>>({});
  const [selectedForReturn, setSelectedForReturn] = useState<Record<string, boolean>>({});
  const [returnNotes, setReturnNotes] = useState("");
  const [processingReturns, setProcessingReturns] = useState(false);

  const [selectedToAssign, setSelectedToAssign] = useState<Record<string, boolean>>({});
  const [assignNotes, setAssignNotes] = useState("");
  const [processingAssign, setProcessingAssign] = useState(false);

  const load = useCallback(async () => {
    try {
      const [currentRes, availableRes, allRes, propertiesRes, historyRes] = await Promise.all([
        fetch(`/api/people/${personId}/assets`),
        fetch("/api/assets?assignmentType=unassigned&active=true"),
        fetch("/api/assets"),
        fetch("/api/properties"),
        fetch(`/api/people/${personId}/assignment-history`),
      ]);

      if (currentRes.ok) {
        const data = await currentRes.json();
        setCurrentAssets(data.assets ?? []);
      }
      if (availableRes.ok) {
        const data = await availableRes.json();
        setAvailableAssets(data.assets ?? []);
      }
      if (allRes.ok) {
        const data = await allRes.json();
        setAllAssets(data.assets ?? []);
      }
      if (propertiesRes.ok) {
        const data = await propertiesRes.json();
        setProperties(data.properties ?? []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.history ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    load();
  }, [load]);

  const assetLabelById = useMemo(
    () => new Map(allAssets.map((asset) => [asset.id, `${asset.assetTag} · ${asset.displayName}`])),
    [allAssets],
  );

  async function handleProcessReturns() {
    setError(null);
    const actions = currentAssets
      .filter((asset) => selectedForReturn[asset.id])
      .map((asset) => {
        const target = returnTargets[asset.id] ?? "unassigned";
        return target === "unassigned"
          ? { assetId: asset.id, targetType: "unassigned" as const }
          : { assetId: asset.id, targetType: "property" as const, propertyId: target };
      });

    if (actions.length === 0) {
      setError("Select at least one asset to return.");
      return;
    }

    setProcessingReturns(true);
    try {
      const response = await fetch(`/api/people/${personId}/offboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions, notes: returnNotes || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not process the returns.");
        return;
      }
      setSelectedForReturn({});
      setReturnNotes("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setProcessingReturns(false);
    }
  }

  async function handleAssign() {
    setError(null);
    const assetIds = Object.keys(selectedToAssign).filter((id) => selectedToAssign[id]);
    if (assetIds.length === 0) {
      setError("Select at least one asset to assign.");
      return;
    }

    setProcessingAssign(true);
    try {
      const response = await fetch(`/api/people/${personId}/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds, notes: assignNotes || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not assign the assets.");
        return;
      }
      setSelectedToAssign({});
      setAssignNotes("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setProcessingAssign(false);
    }
  }

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Currently assigned</h2>
        {currentAssets.length === 0 ? (
          <p className="muted">This person has no assets assigned right now.</p>
        ) : (
          <>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {currentAssets.map((asset) => (
                <li key={asset.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  {canOffboard ? (
                    <input
                      type="checkbox"
                      checked={Boolean(selectedForReturn[asset.id])}
                      onChange={(event) =>
                        setSelectedForReturn((prev) => ({ ...prev, [asset.id]: event.target.checked }))
                      }
                    />
                  ) : null}
                  <Link href={`/assets/${asset.id}`} style={{ fontWeight: 600, flex: 1 }}>
                    {asset.assetTag} · {asset.displayName}
                  </Link>
                  {canOffboard ? (
                    <select
                      className="input"
                      style={{ maxWidth: 220 }}
                      value={returnTargets[asset.id] ?? "unassigned"}
                      onChange={(event) =>
                        setReturnTargets((prev) => ({ ...prev, [asset.id]: event.target.value }))
                      }
                    >
                      <option value="unassigned">Return to unassigned</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          Reassign to {property.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </li>
              ))}
            </ul>
            {canOffboard ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <input
                  className="input"
                  placeholder="Return note (optional)"
                  value={returnNotes}
                  onChange={(event) => setReturnNotes(event.target.value)}
                />
                <button
                  type="button"
                  className="button button-primary"
                  disabled={processingReturns}
                  style={{ alignSelf: "flex-start" }}
                  onClick={handleProcessReturns}
                >
                  {processingReturns ? "Processing…" : "Process selected returns"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {canOnboard ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <h2 style={{ fontSize: "1rem" }}>Assign additional assets</h2>
          {availableAssets.length === 0 ? (
            <p className="muted">No unassigned assets are available right now.</p>
          ) : (
            <>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 260, overflowY: "auto" }}>
                {availableAssets.map((asset) => (
                  <li key={asset.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedToAssign[asset.id])}
                      onChange={(event) =>
                        setSelectedToAssign((prev) => ({ ...prev, [asset.id]: event.target.checked }))
                      }
                    />
                    <span>
                      {asset.assetTag} · {asset.displayName}
                    </span>
                  </li>
                ))}
              </ul>
              <input
                className="input"
                placeholder="Assignment note (optional)"
                value={assignNotes}
                onChange={(event) => setAssignNotes(event.target.value)}
              />
              <button
                type="button"
                className="button button-primary"
                disabled={processingAssign}
                style={{ alignSelf: "flex-start" }}
                onClick={handleAssign}
              >
                {processingAssign ? "Assigning…" : "Assign selected assets"}
              </button>
            </>
          )}
        </div>
      ) : null}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Assignment history</h2>
        {history.length === 0 ? (
          <p className="muted">No assignment history yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {history.map((entry) => (
              <li key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <Link href={`/assets/${entry.assetId}`}>{assetLabelById.get(entry.assetId) ?? "Asset"}</Link>
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  {new Date(entry.assignedAt).toLocaleDateString()}
                  {" – "}
                  {entry.returnedAt ? new Date(entry.returnedAt).toLocaleDateString() : "current"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
