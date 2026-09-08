"use client";

import { useEffect, useState } from "react";

interface ActivityRecord {
  id: string;
  action: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "vendor.create": "Vendor created",
  "vendor.update": "Vendor updated",
  "vendor.activated": "Vendor activated",
  "vendor.deactivated": "Vendor deactivated",
  "vendor.preferred_changed": "Preferred status changed",
  "vendor.categories_updated": "Service categories updated",
  "vendor.contact_create": "Contact added",
  "vendor.contact_update": "Contact updated",
  "vendor.contact_activate": "Contact reactivated",
  "vendor.contact_deactivate": "Contact deactivated",
  "vendor.coverage_add": "Property coverage added",
  "vendor.coverage_remove": "Property coverage removed",
  "vendor.document_upload": "Document uploaded",
  "vendor.document_download": "Document downloaded",
};

export function VendorActivityPanel({ vendorId }: { vendorId: string }) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}/activity`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setActivity(data.activity ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [vendorId]);

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
