"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  PM_OCCURRENCE_STATUS_LABELS,
  type PmOccurrenceStatus,
} from "@/lib/preventive-maintenance/constants";
import { classifyDueState } from "@/lib/preventive-maintenance/recurrence";
import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/lib/work-orders/constants";

export interface PreventiveMaintenancePlanRecord {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  defaultPriority: string;
  isActive: boolean;
  nextDueAt: string;
  lastGeneratedAt: string | null;
  lastCompletedAt: string | null;
  intervalUnit: string;
  intervalValue: number;
}

interface OpenWorkOrderConflict {
  id: string;
  number: string;
  status: WorkOrderStatus;
  assignedUserId: string | null;
  assigneeName: string | null;
}

interface OccurrenceRow {
  id: string;
  dueDate: string;
  status: PmOccurrenceStatus;
  generatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  workOrderId: string | null;
  workOrderNumber: string | null;
  workOrderStatus: string | null;
}

function recurrenceLabel(intervalUnit: string, intervalValue: number): string {
  const unitLabel = intervalUnit === "week" ? "week" : "month";
  return intervalValue === 1 ? `Every ${unitLabel}` : `Every ${intervalValue} ${unitLabel}s`;
}

export function PreventiveMaintenanceDetailPanel({
  initialPlan,
  propertyName,
  equipmentName,
  categoryName,
  assigneeName,
  vendorName,
  canEdit,
  canManageStatus,
  canGenerate,
  canViewWorkOrders,
}: {
  initialPlan: PreventiveMaintenancePlanRecord;
  propertyName: string;
  equipmentName: string | null;
  categoryName: string;
  assigneeName: string | null;
  vendorName: string | null;
  canEdit: boolean;
  canManageStatus: boolean;
  canGenerate: boolean;
  canViewWorkOrders: boolean;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [occurrences, setOccurrences] = useState<OccurrenceRow[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openConflict, setOpenConflict] = useState<OpenWorkOrderConflict | null>(null);
  const [confirmingDuplicate, setConfirmingDuplicate] = useState(false);

  const loadOccurrences = useCallback(() => {
    return fetch(`/api/preventive-maintenance-plans/${plan.id}/occurrences`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setOccurrences(data.occurrences ?? []);
      });
  }, [plan.id]);

  useEffect(() => {
    loadOccurrences().finally(() => setLoadingOccurrences(false));
  }, [loadOccurrences]);

  async function toggleActive() {
    setError(null);
    setBusy(true);
    const response = await fetch(`/api/preventive-maintenance-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(data?.error ?? "Could not update the plan.");
      return;
    }
    setPlan(data.plan);
  }

  async function generateNow(confirmDuplicate: boolean) {
    setError(null);
    setNotice(null);
    setBusy(true);
    const response = await fetch(`/api/preventive-maintenance-plans/${plan.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmDuplicate }),
    });
    const data = await response.json().catch(() => null);
    setBusy(false);

    if (response.status === 409 && data?.status === "blocked") {
      setOpenConflict(data.openWorkOrder);
      setConfirmingDuplicate(false);
      return;
    }
    if (response.status === 409) {
      setNotice("A work order for the current due occurrence has already been generated.");
      return;
    }
    if (!response.ok) {
      setError(data?.error ?? "Could not generate a work order.");
      return;
    }

    setOpenConflict(null);
    setConfirmingDuplicate(false);
    setPlan(data.plan);
    setNotice(`Generated work order ${data.workOrder.number}.`);
    loadOccurrences();
  }

  const dueState = plan.isActive ? classifyDueState(plan.nextDueAt) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}
      {notice ? <p className="muted">{notice}</p> : null}

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Property</div>
          <div>{propertyName}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Equipment</div>
          <div>{equipmentName ?? "Whole property"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Category</div>
          <div>{categoryName}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Default priority</div>
          <div>{WORK_ORDER_PRIORITY_LABELS[plan.defaultPriority as WorkOrderPriority] ?? plan.defaultPriority}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Default assignee</div>
          <div>{assigneeName ?? "Unassigned"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Default vendor</div>
          <div>{vendorName ?? "None"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Recurrence</div>
          <div>{recurrenceLabel(plan.intervalUnit, plan.intervalValue)}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Next due</div>
          <div>
            {plan.nextDueAt}
            {dueState && dueState !== "upcoming" ? ` (${dueState === "overdue" ? "Overdue" : "Due Soon"})` : ""}
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Last generated</div>
          <div>{plan.lastGeneratedAt ? new Date(plan.lastGeneratedAt).toLocaleString() : "Never"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Last completed</div>
          <div>{plan.lastCompletedAt ? new Date(plan.lastCompletedAt).toLocaleString() : "Never"}</div>
        </div>
      </div>

      {plan.instructions ? (
        <div className="card">
          <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>Maintenance instructions</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{plan.instructions}</p>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {canEdit ? (
          <Link href={`/preventive-maintenance/${plan.id}/edit`} className="button">
            Edit plan
          </Link>
        ) : null}
        {canManageStatus ? (
          <button type="button" className="button" onClick={toggleActive} disabled={busy}>
            {plan.isActive ? "Deactivate plan" : "Activate plan"}
          </button>
        ) : null}
        {canGenerate && plan.isActive && !openConflict ? (
          <button
            type="button"
            className="button button-primary"
            onClick={() => generateNow(false)}
            disabled={busy}
          >
            {busy ? "Generating…" : "Generate Due Work Order"}
          </button>
        ) : null}
      </div>

      {canGenerate && openConflict ? (
        <div className="card" style={{ borderColor: "var(--danger)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              An open Preventive Maintenance Work Order already exists for this item.
            </p>
            <ul className="muted" style={{ fontSize: "0.9rem", paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <li>
                Work Order {openConflict.number} · {WORK_ORDER_STATUS_LABELS[openConflict.status] ?? openConflict.status}
              </li>
              <li>Property: {propertyName}</li>
              {equipmentName ? <li>Equipment: {equipmentName}</li> : null}
              {openConflict.assigneeName ? <li>Assigned to: {openConflict.assigneeName}</li> : null}
            </ul>
          </div>

          {!confirmingDuplicate ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              {canViewWorkOrders ? (
                <Link href={`/work-orders/${openConflict.id}`} className="button button-primary">
                  Open Existing Work Order
                </Link>
              ) : (
                <span className="muted">
                  Work order {openConflict.number} ({WORK_ORDER_STATUS_LABELS[openConflict.status] ?? openConflict.status})
                </span>
              )}
              <button type="button" className="button" onClick={() => setConfirmingDuplicate(true)}>
                Generate Another Work Order
              </button>
              <button type="button" className="button" onClick={() => setOpenConflict(null)}>
                Dismiss
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <p>
                Are you sure? This will create an additional Work Order for the same Preventive
                Maintenance item.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="button" onClick={() => setConfirmingDuplicate(false)} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => generateNow(true)}
                  disabled={busy}
                >
                  {busy ? "Generating…" : "Yes, Generate Another Work Order"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Occurrence history</h2>
        {loadingOccurrences ? (
          <p className="muted">Loading…</p>
        ) : occurrences.length === 0 ? (
          <p className="muted">No work orders have been generated from this plan yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {occurrences.map((occurrence) => (
              <li key={occurrence.id} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  Due {occurrence.dueDate}
                  {occurrence.workOrderId ? (
                    <>
                      {" · "}
                      <Link href={`/work-orders/${occurrence.workOrderId}`}>{occurrence.workOrderNumber}</Link>
                    </>
                  ) : null}
                </div>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {PM_OCCURRENCE_STATUS_LABELS[occurrence.status]}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
