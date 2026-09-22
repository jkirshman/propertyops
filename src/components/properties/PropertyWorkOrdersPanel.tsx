"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { UnitFilterSelect } from "@/components/shared/UnitFilterSelect";
import {
  UNIT_FILTER_ALL,
  buildUnitFilterOptions,
  formatRecordUnitLabel,
  matchesUnitFilter,
} from "@/lib/property-units/unit-display";
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
  // UNIT-OPS-1
  propertyUnitId: string | null;
  unitLabel: string | null;
  unitIsActive: boolean | null;
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
  const [unitFilter, setUnitFilter] = useState(UNIT_FILTER_ALL);

  useEffect(() => {
    fetch(`/api/work-orders?propertyId=${propertyId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setWorkOrders(data.workOrders ?? []);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  // UNIT-OPS-1: the server already dropped other Units' Work Orders, so the
  // filter (and the per-row Unit label) only ever shows the viewer's Units.
  const unitFilterOptions = useMemo(() => buildUnitFilterOptions(workOrders), [workOrders]);
  const showUnits = workOrders.some((wo) => wo.propertyUnitId !== null);
  const visibleWorkOrders = workOrders.filter((wo) => matchesUnitFilter(wo, unitFilter));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <UnitFilterSelect id="property-work-orders-unit-filter" options={unitFilterOptions} value={unitFilter} onChange={setUnitFilter} />
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
          {visibleWorkOrders.map((wo) => (
            <li key={wo.id}>
              <Link href={`/work-orders/${wo.id}`} className="card interactive-card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <div className="clickable-title" style={{ fontWeight: 600 }}>{wo.number} · {wo.subject}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {WORK_ORDER_STATUS_LABELS[wo.status as WorkOrderStatus] ?? wo.status}
                    {" · "}
                    {WORK_ORDER_PRIORITY_LABELS[wo.priority as WorkOrderPriority] ?? wo.priority}
                  </div>
                  {showUnits ? (
                    <div style={{ fontSize: "0.85rem", overflowWrap: "anywhere" }}>{formatRecordUnitLabel(wo)}</div>
                  ) : null}
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
