"use client";

import { useEffect, useState } from "react";

interface ActivityRecord {
  id: string;
  action: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "lease.create": "Lease created",
  "lease.update": "Lease updated",
  "lease.status_changed": "Status changed",
  "lease.terminated": "Lease terminated",
  "lease.dates_changed": "Dates changed",
  "lease.document_upload": "Document uploaded",
  "lease.document_download": "Document downloaded",
};

export function LeaseActivityPanel({ leaseId }: { leaseId: string }) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leases/${leaseId}/activity`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setActivity(data.activity ?? []);
      })
      .finally(() => setLoading(false));
  }, [leaseId]);

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
