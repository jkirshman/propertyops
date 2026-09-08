"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EQUIPMENT_SERVICE_TYPE_LABELS, type EquipmentServiceType } from "@/lib/equipment/constants";

interface ServiceRecord {
  id: string;
  propertyEquipmentId: string;
  serviceDate: string;
  serviceType: string;
  summary: string;
  cost: number | null;
}

export function VendorServiceHistoryPanel({ vendorId }: { vendorId: string }) {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}/service-records`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setRecords(data.serviceRecords ?? []);
      })
      .finally(() => setLoading(false));
  }, [vendorId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : records.length === 0 ? (
        <p className="muted">No equipment service records linked to this vendor yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {records.map((record) => (
            <li key={record.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {EQUIPMENT_SERVICE_TYPE_LABELS[record.serviceType as EquipmentServiceType] ?? record.serviceType}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>{record.summary}</div>
                  <Link href={`/equipment/${record.propertyEquipmentId}`} style={{ fontSize: "0.8rem" }}>
                    View equipment
                  </Link>
                </div>
                <div className="muted" style={{ fontSize: "0.85rem", textAlign: "right" }}>
                  <div>{new Date(record.serviceDate).toLocaleDateString()}</div>
                  {record.cost != null ? <div>${record.cost}</div> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
