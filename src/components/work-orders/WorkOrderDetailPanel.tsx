"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WorkOrderActivityPanel } from "@/components/work-orders/WorkOrderActivityPanel";
import { WorkOrderAttachmentsPanel } from "@/components/work-orders/WorkOrderAttachmentsPanel";
import { WorkOrderNotesPanel } from "@/components/work-orders/WorkOrderNotesPanel";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/lib/work-orders/constants";

interface OptionRecord {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  displayName: string;
}

interface EquipmentOption {
  id: string;
  displayName: string;
}

interface AssetOption {
  id: string;
  assetTag: string;
  displayName: string;
}

export interface WorkOrderRecord {
  id: string;
  number: string;
  subject: string;
  description: string | null;
  categoryId: string;
  priority: string;
  status: string;
  assignedUserId: string | null;
  propertyEquipmentId: string | null;
  assetId: string | null;
  resolutionSummary: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
}

const TABS = ["description", "notes", "attachments", "activity", "resolution"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  description: "Description",
  notes: "Notes",
  attachments: "Attachments",
  activity: "Activity",
  resolution: "Resolution / Closure",
};

export function WorkOrderDetailPanel({
  initialWorkOrder,
  propertyId,
  categories,
  users,
  assets,
  canEdit,
  canAssign,
  canManageStatus,
  canManageNotes,
  canManageAttachments,
}: {
  initialWorkOrder: WorkOrderRecord;
  propertyId: string;
  categories: OptionRecord[];
  users: UserOption[];
  assets: AssetOption[];
  canEdit: boolean;
  canAssign: boolean;
  canManageStatus: boolean;
  canManageNotes: boolean;
  canManageAttachments: boolean;
}) {
  const [workOrder, setWorkOrder] = useState(initialWorkOrder);
  const [tab, setTab] = useState<Tab>("description");
  const [error, setError] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState(workOrder.subject);
  const [descriptionDraft, setDescriptionDraft] = useState(workOrder.description ?? "");
  const [resolutionDraft, setResolutionDraft] = useState(workOrder.resolutionSummary ?? "");
  const [saving, setSaving] = useState(false);
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([]);

  useEffect(() => {
    fetch(`/api/properties/${propertyId}/equipment?activeOnly=true`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setEquipmentOptions(data.equipment ?? []);
      });
  }, [propertyId]);

  async function patch(fields: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/work-orders/${workOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.message ?? "Could not save the change.");
      return null;
    }
    setWorkOrder(data.workOrder);
    return data.workOrder;
  }

  async function handleSaveDescription() {
    if (!subjectDraft.trim()) {
      setError("Subject cannot be empty.");
      return;
    }
    setSaving(true);
    const result = await patch({ subject: subjectDraft, description: descriptionDraft });
    setSaving(false);
    if (result) setEditingDescription(false);
  }

  async function handleSaveResolution() {
    setSaving(true);
    await patch({ resolutionSummary: resolutionDraft });
    setSaving(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.9rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Status</div>
          <select
            className="input"
            value={workOrder.status}
            disabled={!canManageStatus}
            onChange={(event) => patch({ status: event.target.value })}
          >
            {WORK_ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {WORK_ORDER_STATUS_LABELS[value as WorkOrderStatus]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Priority</div>
          <select
            className="input"
            value={workOrder.priority}
            disabled={!canEdit}
            onChange={(event) => patch({ priority: event.target.value })}
          >
            {WORK_ORDER_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {WORK_ORDER_PRIORITY_LABELS[value as WorkOrderPriority]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Category</div>
          <select
            className="input"
            value={workOrder.categoryId}
            disabled={!canEdit}
            onChange={(event) => patch({ categoryId: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Assigned to</div>
          <select
            className="input"
            value={workOrder.assignedUserId ?? ""}
            disabled={!canAssign}
            onChange={(event) => patch({ assignedUserId: event.target.value || null })}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Related equipment</div>
          <select
            className="input"
            value={workOrder.propertyEquipmentId ?? ""}
            disabled={!canEdit}
            onChange={(event) => patch({ propertyEquipmentId: event.target.value || null })}
          >
            <option value="">None</option>
            {equipmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.displayName}
              </option>
            ))}
          </select>
          {workOrder.propertyEquipmentId ? (
            <Link href={`/equipment/${workOrder.propertyEquipmentId}`} style={{ fontSize: "0.8rem" }}>
              Open equipment
            </Link>
          ) : null}
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Related asset</div>
          <select
            className="input"
            value={workOrder.assetId ?? ""}
            disabled={!canEdit}
            onChange={(event) => patch({ assetId: event.target.value || null })}
          >
            <option value="">None</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.assetTag} · {asset.displayName}
              </option>
            ))}
          </select>
          {workOrder.assetId ? (
            <Link href={`/assets/${workOrder.assetId}`} style={{ fontSize: "0.8rem" }}>
              Open asset
            </Link>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            style={{
              padding: "0.6rem 0.9rem",
              background: "none",
              border: "none",
              borderBottom: tab === value ? "2px solid var(--brand)" : "2px solid transparent",
              fontWeight: tab === value ? 600 : 500,
              color: tab === value ? "var(--foreground)" : "var(--muted)",
              cursor: "pointer",
            }}
          >
            {TAB_LABELS[value]}
          </button>
        ))}
      </div>

      {tab === "description" ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {editingDescription ? (
            <>
              <div>
                <label className="label" htmlFor="edit-subject">Subject</label>
                <input
                  id="edit-subject"
                  className="input"
                  value={subjectDraft}
                  onChange={(event) => setSubjectDraft(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  className="input"
                  rows={5}
                  value={descriptionDraft}
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="button button-primary" onClick={handleSaveDescription} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="button" onClick={() => setEditingDescription(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ whiteSpace: "pre-wrap" }}>{workOrder.description || "No description provided."}</p>
              {canEdit ? (
                <button
                  type="button"
                  className="button"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => {
                    setSubjectDraft(workOrder.subject);
                    setDescriptionDraft(workOrder.description ?? "");
                    setEditingDescription(true);
                  }}
                >
                  Edit subject & description
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {tab === "notes" ? <WorkOrderNotesPanel workOrderId={workOrder.id} canManage={canManageNotes} /> : null}
      {tab === "attachments" ? (
        <WorkOrderAttachmentsPanel workOrderId={workOrder.id} canManage={canManageAttachments} />
      ) : null}
      {tab === "activity" ? <WorkOrderActivityPanel workOrderId={workOrder.id} /> : null}

      {tab === "resolution" ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            Resolved: {workOrder.resolvedAt ? new Date(workOrder.resolvedAt).toLocaleString() : "Not yet"}
            {" · "}
            Closed: {workOrder.closedAt ? new Date(workOrder.closedAt).toLocaleString() : "Not yet"}
          </div>
          <div>
            <label className="label" htmlFor="resolution-summary">Resolution summary (optional)</label>
            <textarea
              id="resolution-summary"
              className="input"
              rows={4}
              value={resolutionDraft}
              disabled={!canManageStatus}
              onChange={(event) => setResolutionDraft(event.target.value)}
            />
          </div>
          {canManageStatus ? (
            <button
              type="button"
              className="button button-primary"
              style={{ alignSelf: "flex-start" }}
              onClick={handleSaveResolution}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save resolution summary"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
