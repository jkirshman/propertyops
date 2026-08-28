"use client";

import { useEffect, useState } from "react";

interface ActivityRecord {
  id: string;
  action: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "asset.create": "Asset created",
  "asset.update": "Asset updated",
  "asset.activate": "Asset reactivated",
  "asset.deactivate": "Asset deactivated",
  "asset.assigned": "Assigned",
  "asset.returned": "Returned to unassigned",
  "asset.retired": "Retired",
  "asset.disposed": "Disposed",
  "asset.reactivated": "Reactivated from retired",
  "asset.document_upload": "Document uploaded",
  "asset.document_download": "Document downloaded",
  "work_order.asset_linked": "Linked to a work order",
  "work_order.asset_unlinked": "Unlinked from a work order",
};

export function AssetActivityPanel({ assetId }: { assetId: string }) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assets/${assetId}/activity`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setActivity(data.activity ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [assetId]);

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  if (activity.length === 0) {
    return <p className="muted">No activity recorded yet.</p>;
  }

  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {activity.map((entry) => (
        <li key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <span>{ACTION_LABELS[entry.action] ?? entry.action}</span>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {new Date(entry.createdAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
