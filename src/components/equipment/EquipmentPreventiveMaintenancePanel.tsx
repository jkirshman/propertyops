"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PM_DUE_STATE_LABELS } from "@/lib/preventive-maintenance/constants";
import { classifyDueState } from "@/lib/preventive-maintenance/recurrence";

interface PlanRow {
  id: string;
  name: string;
  nextDueAt: string;
  isActive: boolean;
}

interface WorkOrderRow {
  id: string;
  number: string;
  subject: string;
  status: string;
  source: string;
  updatedAt: string;
}

export function EquipmentPreventiveMaintenancePanel({
  propertyEquipmentId,
  canCreate,
}: {
  propertyEquipmentId: string;
  canCreate: boolean;
}) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [generatedWorkOrders, setGeneratedWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/preventive-maintenance-plans?propertyEquipmentId=${propertyEquipmentId}`)
        .then((response) => (response.ok ? response.json() : null)),
      fetch(`/api/work-orders?propertyEquipmentId=${propertyEquipmentId}`)
        .then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([planData, workOrderData]) => {
        setPlans(planData?.plans ?? []);
        const workOrders: WorkOrderRow[] = workOrderData?.workOrders ?? [];
        setGeneratedWorkOrders(workOrders.filter((wo) => wo.source === "preventive_maintenance"));
      })
      .finally(() => setLoading(false));
  }, [propertyEquipmentId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {canCreate ? (
        <Link
          href={`/preventive-maintenance/new?equipmentId=${propertyEquipmentId}`}
          className="button button-primary"
          style={{ alignSelf: "flex-start" }}
        >
          New Plan for This Equipment
        </Link>
      ) : null}

      <div>
        <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Plans</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="muted">No preventive maintenance plans target this equipment yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {plans.map((plan) => (
              <li key={plan.id} className="card">
                <Link href={`/preventive-maintenance/${plan.id}`} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>{plan.name}{!plan.isActive ? " · Inactive" : ""}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    Next due {plan.nextDueAt}
                    {plan.isActive ? ` · ${PM_DUE_STATE_LABELS[classifyDueState(plan.nextDueAt)]}` : ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Recently generated work orders</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : generatedWorkOrders.length === 0 ? (
          <p className="muted">No preventive maintenance work orders generated for this equipment yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {generatedWorkOrders.map((wo) => (
              <li key={wo.id} className="card">
                <Link href={`/work-orders/${wo.id}`} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>{wo.number} · {wo.subject}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>{wo.status}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
