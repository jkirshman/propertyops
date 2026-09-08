"use client";

import { useEffect, useState } from "react";

interface ActivityRecord {
  id: string;
  action: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "tenant.create": "Tenant created",
  "tenant.update": "Tenant updated",
  "tenant.activated": "Tenant activated",
  "tenant.deactivated": "Tenant deactivated",
  "tenant.contact_create": "Contact added",
  "tenant.contact_update": "Contact updated",
  "tenant.contact_activate": "Contact reactivated",
  "tenant.contact_deactivate": "Contact deactivated",
  "tenant.document_upload": "Document uploaded",
  "tenant.document_download": "Document downloaded",
};

export function TenantActivityPanel({ tenantId }: { tenantId: string }) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tenants/${tenantId}/activity`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setActivity(data.activity ?? []);
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

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
