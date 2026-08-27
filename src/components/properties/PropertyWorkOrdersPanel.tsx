"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/lib/work-orders/constants";

interface WorkOrderRow {
  id: string;
  number: string;
  subject: string;
  priority: string;
  status: string;
  updatedAt: string;
}

export function PropertyWorkOrdersPanel({
  propertyId,
  canCreate,
}: {
  propertyId: string;
  canCreate: boolean;
}) {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/work-orders?propertyId=${propertyId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setWorkOrders(data.workOrders ?? []);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canCreate ? (
        <Link href={`/work-orders/new?propertyId=${propertyId}`} className="button button-primary" style={{ alignSelf: "flex-start" }}>
          New Work Order
        </Link>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : workOrders.length === 0 ? (
        <p className="muted">No work orders for this property yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {workOrders.map((wo) => (
            <li key={wo.id} className="card">
              <Link href={`/work-orders/${wo.id}`} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{wo.number} · {wo.subject}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {WORK_ORDER_STATUS_LABELS[wo.status as WorkOrderStatus] ?? wo.status}
                    {" · "}
                    {WORK_ORDER_PRIORITY_LABELS[wo.priority as WorkOrderPriority] ?? wo.priority}
                  </div>
                </div>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  {new Date(wo.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
