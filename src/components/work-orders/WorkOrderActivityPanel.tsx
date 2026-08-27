"use client";

import { useEffect, useState } from "react";

interface ActivityRecord {
  id: string;
  action: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "work_order.create": "Work order created",
  "work_order.update": "Work order updated",
  "work_order.status_changed": "Status changed",
  "work_order.priority_changed": "Priority changed",
  "work_order.category_changed": "Category changed",
  "work_order.assigned": "Assigned",
  "work_order.unassigned": "Unassigned",
  "work_order.note_create": "Note added",
  "work_order.document_upload": "Attachment uploaded",
  "work_order.document_download": "Attachment downloaded",
};

export function WorkOrderActivityPanel({ workOrderId }: { workOrderId: string }) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/work-orders/${workOrderId}/activity`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setActivity(data.activity ?? []);
      })
      .finally(() => setLoading(false));
  }, [workOrderId]);

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
