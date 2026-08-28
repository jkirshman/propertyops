"use client";

import { useEffect, useState } from "react";

interface ActivityRecord {
  id: string;
  action: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "property_equipment.create": "Equipment created",
  "property_equipment.update": "Equipment updated",
  "property_equipment.status_changed": "Status changed",
  "property_equipment.condition_changed": "Condition changed",
  "property_equipment.activate": "Equipment reactivated",
  "property_equipment.deactivate": "Equipment retired",
  "property_equipment.service_record_create": "Service record added",
  "property_equipment.service_record_update": "Service record updated",
  "property_equipment.document_upload": "Document uploaded",
  "property_equipment.document_download": "Document downloaded",
  "work_order.equipment_linked": "Linked to a work order",
  "work_order.equipment_unlinked": "Unlinked from a work order",
};

export function EquipmentActivityPanel({ propertyEquipmentId }: { propertyEquipmentId: string }) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/property-equipment/${propertyEquipmentId}/activity`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setActivity(data.activity ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [propertyEquipmentId]);

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
