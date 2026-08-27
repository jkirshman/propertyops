"use client";

import { useEffect, useState } from "react";

interface ActivityRecord {
  id: string;
  action: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "property.create": "Property created",
  "property.update": "Property updated",
  "property.activate": "Property activated",
  "property.deactivate": "Property deactivated",
  "property.contact_create": "Contact added",
  "property.contact_update": "Contact updated",
  "property.contact_activate": "Contact reactivated",
  "property.contact_deactivate": "Contact deactivated",
  "property.note_create": "Note added",
  "property.document_upload": "Document uploaded",
  "property.document_download": "Document downloaded",
};

export function ActivityPanel({ propertyId }: { propertyId: string }) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/properties/${propertyId}/activity`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setActivity(data.activity ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

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
