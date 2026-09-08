"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PM_DUE_STATE_LABELS } from "@/lib/preventive-maintenance/constants";
import { classifyDueState } from "@/lib/preventive-maintenance/recurrence";

interface PlanRow {
  id: string;
  name: string;
  propertyEquipmentId: string | null;
  nextDueAt: string;
  isActive: boolean;
}

export function PropertyPreventiveMaintenancePanel({
  propertyId,
  canCreate,
}: {
  propertyId: string;
  canCreate: boolean;
}) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/preventive-maintenance-plans?propertyId=${propertyId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setPlans(data.plans ?? []);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canCreate ? (
        <Link
          href={`/preventive-maintenance/new?propertyId=${propertyId}`}
          className="button button-primary"
          style={{ alignSelf: "flex-start" }}
        >
          New Plan
        </Link>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : plans.length === 0 ? (
        <p className="muted">No preventive maintenance plans for this property yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {plans.map((plan) => (
            <li key={plan.id} className="card">
              <Link href={`/preventive-maintenance/${plan.id}`} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{plan.name}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {plan.propertyEquipmentId ? "Equipment-specific" : "Whole property"}
                    {!plan.isActive ? " · Inactive" : ""}
                  </div>
                </div>
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
  );
}
