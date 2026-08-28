"use client";

import { useState } from "react";

import { EquipmentActivityPanel } from "@/components/equipment/EquipmentActivityPanel";
import { EquipmentDocumentsPanel } from "@/components/equipment/EquipmentDocumentsPanel";
import { EquipmentServiceHistoryPanel } from "@/components/equipment/EquipmentServiceHistoryPanel";
import { EquipmentWorkOrdersPanel } from "@/components/equipment/EquipmentWorkOrdersPanel";
import {
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentCondition,
  type EquipmentStatus,
} from "@/lib/equipment/constants";

export interface EquipmentRecord {
  id: string;
  displayName: string;
  equipmentTag: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  locationInProperty: string | null;
  installedDate: string | null;
  status: string;
  condition: string;
  isActive: boolean;
  notes: string | null;
}

const TABS = ["overview", "service", "workorders", "documents", "activity"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  service: "Service History",
  workorders: "Work Orders",
  documents: "Documents",
  activity: "Activity",
};

export function EquipmentDetailPanel({
  initialEquipment,
  canEdit,
  canManageService,
  canManageDocuments,
  canCreateWorkOrders,
}: {
  initialEquipment: EquipmentRecord;
  canEdit: boolean;
  canManageService: boolean;
  canManageDocuments: boolean;
  canCreateWorkOrders: boolean;
}) {
  const [equipment, setEquipment] = useState(initialEquipment);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [draft, setDraft] = useState({
    displayName: equipment.displayName,
    manufacturer: equipment.manufacturer ?? "",
    model: equipment.model ?? "",
    serialNumber: equipment.serialNumber ?? "",
    locationInProperty: equipment.locationInProperty ?? "",
    installedDate: equipment.installedDate ?? "",
    notes: equipment.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function patch(fields: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/property-equipment/${equipment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.message ?? "Could not save the change.");
      return null;
    }
    setEquipment(data.equipment);
    return data.equipment;
  }

  async function handleSaveDetails() {
    if (!draft.displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }
    setSaving(true);
    const result = await patch({
      displayName: draft.displayName,
      manufacturer: draft.manufacturer || undefined,
      model: draft.model || undefined,
      serialNumber: draft.serialNumber || undefined,
      locationInProperty: draft.locationInProperty || undefined,
      installedDate: draft.installedDate || undefined,
      notes: draft.notes || undefined,
    });
    setSaving(false);
    if (result) setEditingDetails(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.9rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Status</div>
          <select
            className="input"
            value={equipment.status}
            disabled={!canEdit}
            onChange={(event) => patch({ status: event.target.value })}
          >
            {EQUIPMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {EQUIPMENT_STATUS_LABELS[value as EquipmentStatus]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Condition</div>
          <select
            className="input"
            value={equipment.condition}
            disabled={!canEdit}
            onChange={(event) => patch({ condition: event.target.value })}
          >
            {EQUIPMENT_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {EQUIPMENT_CONDITION_LABELS[value as EquipmentCondition]}
              </option>
            ))}
          </select>
        </div>
        {canEdit ? (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              className="button"
              onClick={() => patch({ isActive: !equipment.isActive, status: equipment.isActive ? "retired" : "active" })}
            >
              {equipment.isActive ? "Retire equipment" : "Reactivate equipment"}
            </button>
          </div>
        ) : null}
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

      {tab === "overview" ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {editingDetails ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                <div>
                  <label className="label" htmlFor="equipment-name">Display name</label>
                  <input
                    id="equipment-name"
                    className="input"
                    value={draft.displayName}
                    onChange={(event) => setDraft((prev) => ({ ...prev, displayName: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="equipment-manufacturer">Manufacturer</label>
                  <input
                    id="equipment-manufacturer"
                    className="input"
                    value={draft.manufacturer}
                    onChange={(event) => setDraft((prev) => ({ ...prev, manufacturer: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="equipment-model">Model</label>
                  <input
                    id="equipment-model"
                    className="input"
                    value={draft.model}
                    onChange={(event) => setDraft((prev) => ({ ...prev, model: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="equipment-serial">Serial number</label>
                  <input
                    id="equipment-serial"
                    className="input"
                    value={draft.serialNumber}
                    onChange={(event) => setDraft((prev) => ({ ...prev, serialNumber: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="equipment-location">Location in property</label>
                  <input
                    id="equipment-location"
                    className="input"
                    value={draft.locationInProperty}
                    onChange={(event) => setDraft((prev) => ({ ...prev, locationInProperty: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="equipment-installed">Installed date</label>
                  <input
                    id="equipment-installed"
                    type="date"
                    className="input"
                    value={draft.installedDate}
                    onChange={(event) => setDraft((prev) => ({ ...prev, installedDate: event.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="equipment-notes">Notes</label>
                <textarea
                  id="equipment-notes"
                  className="input"
                  rows={3}
                  value={draft.notes}
                  onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="button button-primary" onClick={handleSaveDetails} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="button" onClick={() => setEditingDetails(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
                <div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>Equipment tag</div>
                  <div>{equipment.equipmentTag ?? "Not set"}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>Manufacturer / model</div>
                  <div>{[equipment.manufacturer, equipment.model].filter(Boolean).join(" ") || "Not set"}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>Serial number</div>
                  <div>{equipment.serialNumber ?? "Not set"}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>Location in property</div>
                  <div>{equipment.locationInProperty ?? "Not set"}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>Installed date</div>
                  <div>{equipment.installedDate ?? "Not set"}</div>
                </div>
              </div>
              {equipment.notes ? (
                <div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>Notes</div>
                  <p style={{ whiteSpace: "pre-wrap" }}>{equipment.notes}</p>
                </div>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  className="button"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => {
                    setDraft({
                      displayName: equipment.displayName,
                      manufacturer: equipment.manufacturer ?? "",
                      model: equipment.model ?? "",
                      serialNumber: equipment.serialNumber ?? "",
                      locationInProperty: equipment.locationInProperty ?? "",
                      installedDate: equipment.installedDate ?? "",
                      notes: equipment.notes ?? "",
                    });
                    setEditingDetails(true);
                  }}
                >
                  Edit details
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {tab === "service" ? (
        <EquipmentServiceHistoryPanel propertyEquipmentId={equipment.id} canManage={canManageService} />
      ) : null}
      {tab === "workorders" ? (
        <EquipmentWorkOrdersPanel propertyEquipmentId={equipment.id} canCreate={canCreateWorkOrders} />
      ) : null}
      {tab === "documents" ? (
        <EquipmentDocumentsPanel propertyEquipmentId={equipment.id} canManage={canManageDocuments} />
      ) : null}
      {tab === "activity" ? <EquipmentActivityPanel propertyEquipmentId={equipment.id} /> : null}
    </div>
  );
}
