"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import {
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
  PROPERTY_EQUIPMENT_TEMPLATE_MODES,
  PROPERTY_EQUIPMENT_TEMPLATE_MODE_LABELS,
  type EquipmentCondition,
  type EquipmentStatus,
  type PropertyEquipmentTemplateMode,
} from "@/lib/equipment/constants";

interface CatalogItemRecord {
  id: string;
  name: string;
}

interface EquipmentRecord {
  id: string;
  equipmentCatalogItemId: string;
  displayName: string;
  manufacturer: string | null;
  model: string | null;
  status: string;
  condition: string;
  isActive: boolean;
}

interface ExpectedVsActualRow {
  equipmentCatalogItemId: string;
  catalogName: string;
  isRequired: boolean;
  expectedQuantity: number;
  actualQuantity: number;
  status: string;
}

const STATUS_BADGE_LABELS: Record<string, string> = {
  expected_present: "Present",
  expected_partial: "Partial",
  expected_missing: "Missing",
  optional_present: "Present (optional)",
  optional_partial: "Partial (optional)",
  optional_missing: "Not installed (optional)",
  extra: "Not templated",
};

interface TemplateOption {
  id: string;
  name: string;
}

interface PropertyRecord {
  equipmentTemplateMode: string;
  equipmentTemplateId: string | null;
}

const EMPTY_NEW_EQUIPMENT = {
  equipmentCatalogItemId: "",
  displayName: "",
  equipmentTag: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  installedDate: "",
  locationInProperty: "",
  status: "active" as EquipmentStatus,
  condition: "unknown" as EquipmentCondition,
  notes: "",
};

export function EquipmentPanel({
  propertyId,
  canCreate,
  canEdit,
  canManageTemplate,
}: {
  propertyId: string;
  canCreate: boolean;
  canEdit: boolean;
  canManageTemplate: boolean;
}) {
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItemRecord[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRecord[]>([]);
  const [expected, setExpected] = useState<{ templateId: string | null; rows: ExpectedVsActualRow[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEquipment, setNewEquipment] = useState(EMPTY_NEW_EQUIPMENT);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [propertyRes, templatesRes, catalogRes, equipmentRes, expectedRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch("/api/equipment-templates?activeOnly=true"),
        fetch("/api/equipment-catalog?activeOnly=true"),
        fetch(`/api/properties/${propertyId}/equipment`),
        fetch(`/api/properties/${propertyId}/equipment/expected-vs-actual`),
      ]);

      if (propertyRes.ok) {
        const data = await propertyRes.json();
        setProperty(data.property);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates ?? []);
      }
      if (catalogRes.ok) {
        const data = await catalogRes.json();
        setCatalogItems(data.catalogItems ?? []);
      }
      if (equipmentRes.ok) {
        const data = await equipmentRes.json();
        setEquipment(data.equipment ?? []);
      }
      if (expectedRes.ok) {
        const data = await expectedRes.json();
        setExpected(data);
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const catalogNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of catalogItems) {
      map.set(item.id, item.name);
    }
    return map;
  }, [catalogItems]);

  async function handleTemplateModeChange(mode: PropertyEquipmentTemplateMode) {
    if (mode === "override" && templates.length === 0) {
      setError("No active templates exist to select from.");
      return;
    }
    setError(null);
    const response = await fetch(`/api/properties/${propertyId}/equipment-template`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        templateId: mode === "override" ? templates[0]?.id : undefined,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.message ?? "Could not update the equipment template selection.");
      return;
    }
    await load();
  }

  async function handleTemplateChange(templateId: string) {
    setError(null);
    const response = await fetch(`/api/properties/${propertyId}/equipment-template`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "override", templateId }),
    });
    if (!response.ok) {
      setError("Could not update the selected template.");
      return;
    }
    await load();
  }

  async function handleAddEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!newEquipment.equipmentCatalogItemId) {
      setError("Select an equipment type.");
      return;
    }
    if (!newEquipment.displayName.trim()) {
      setError("Enter a display name.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/equipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentCatalogItemId: newEquipment.equipmentCatalogItemId,
          displayName: newEquipment.displayName,
          equipmentTag: newEquipment.equipmentTag || undefined,
          manufacturer: newEquipment.manufacturer || undefined,
          model: newEquipment.model || undefined,
          serialNumber: newEquipment.serialNumber || undefined,
          installedDate: newEquipment.installedDate || undefined,
          locationInProperty: newEquipment.locationInProperty || undefined,
          status: newEquipment.status,
          condition: newEquipment.condition,
          notes: newEquipment.notes || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not add the equipment.");
        return;
      }
      setShowAddForm(false);
      setNewEquipment(EMPTY_NEW_EQUIPMENT);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: EquipmentRecord) {
    const deactivating = item.isActive;
    const body = deactivating
      ? { isActive: false, status: "retired" }
      : { isActive: true, status: "active" };
    await fetch(`/api/property-equipment/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Equipment template</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            className="input"
            style={{ maxWidth: 280 }}
            value={property?.equipmentTemplateMode ?? "default"}
            disabled={!canManageTemplate}
            onChange={(event) =>
              handleTemplateModeChange(event.target.value as PropertyEquipmentTemplateMode)
            }
          >
            {PROPERTY_EQUIPMENT_TEMPLATE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {PROPERTY_EQUIPMENT_TEMPLATE_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
          {property?.equipmentTemplateMode === "override" ? (
            <select
              className="input"
              style={{ maxWidth: 280 }}
              value={property.equipmentTemplateId ?? ""}
              disabled={!canManageTemplate}
              onChange={(event) => handleTemplateChange(event.target.value)}
            >
              <option value="">Select a template…</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {!expected?.templateId ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            No template is active for this property, so there is no expected equipment list.
          </p>
        ) : null}
      </div>

      {expected && expected.rows.length > 0 ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <h2 style={{ fontSize: "1rem" }}>Expected vs. actual</h2>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {expected.rows.map((row) => (
              <li
                key={row.equipmentCatalogItemId}
                style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}
              >
                <span>{row.catalogName}</span>
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  {row.actualQuantity} / {row.expectedQuantity || row.actualQuantity} ·{" "}
                  {STATUS_BADGE_LABELS[row.status] ?? row.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1rem" }}>Installed equipment</h2>
          {canCreate ? (
            <button type="button" className="button" onClick={() => setShowAddForm((prev) => !prev)}>
              {showAddForm ? "Cancel" : "+ Add equipment"}
            </button>
          ) : null}
        </div>

        {showAddForm ? (
          <form onSubmit={handleAddEquipment} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
              <div>
                <label className="label" htmlFor="new-equipment-catalog">
                  Equipment type
                </label>
                <select
                  id="new-equipment-catalog"
                  className="input"
                  value={newEquipment.equipmentCatalogItemId}
                  onChange={(event) =>
                    setNewEquipment((prev) => ({ ...prev, equipmentCatalogItemId: event.target.value }))
                  }
                  required
                >
                  <option value="">Select…</option>
                  {catalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="new-equipment-name">
                  Display name
                </label>
                <input
                  id="new-equipment-name"
                  className="input"
                  value={newEquipment.displayName}
                  onChange={(event) => setNewEquipment((prev) => ({ ...prev, displayName: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="new-equipment-manufacturer">
                  Manufacturer
                </label>
                <input
                  id="new-equipment-manufacturer"
                  className="input"
                  value={newEquipment.manufacturer}
                  onChange={(event) => setNewEquipment((prev) => ({ ...prev, manufacturer: event.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="new-equipment-model">
                  Model
                </label>
                <input
                  id="new-equipment-model"
                  className="input"
                  value={newEquipment.model}
                  onChange={(event) => setNewEquipment((prev) => ({ ...prev, model: event.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="new-equipment-serial">
                  Serial number
                </label>
                <input
                  id="new-equipment-serial"
                  className="input"
                  value={newEquipment.serialNumber}
                  onChange={(event) => setNewEquipment((prev) => ({ ...prev, serialNumber: event.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="new-equipment-location">
                  Location in property
                </label>
                <input
                  id="new-equipment-location"
                  className="input"
                  value={newEquipment.locationInProperty}
                  onChange={(event) =>
                    setNewEquipment((prev) => ({ ...prev, locationInProperty: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label" htmlFor="new-equipment-installed">
                  Installed date
                </label>
                <input
                  id="new-equipment-installed"
                  type="date"
                  className="input"
                  value={newEquipment.installedDate}
                  onChange={(event) => setNewEquipment((prev) => ({ ...prev, installedDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="new-equipment-status">
                  Status
                </label>
                <select
                  id="new-equipment-status"
                  className="input"
                  value={newEquipment.status}
                  onChange={(event) =>
                    setNewEquipment((prev) => ({ ...prev, status: event.target.value as EquipmentStatus }))
                  }
                >
                  {EQUIPMENT_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {EQUIPMENT_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="new-equipment-condition">
                  Condition
                </label>
                <select
                  id="new-equipment-condition"
                  className="input"
                  value={newEquipment.condition}
                  onChange={(event) =>
                    setNewEquipment((prev) => ({ ...prev, condition: event.target.value as EquipmentCondition }))
                  }
                >
                  {EQUIPMENT_CONDITIONS.map((value) => (
                    <option key={value} value={value}>
                      {EQUIPMENT_CONDITION_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
              {submitting ? "Saving…" : "Add equipment"}
            </button>
          </form>
        ) : null}

        {equipment.length === 0 ? (
          <p className="muted">No equipment installed yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {equipment.map((item) => (
              <li key={item.id} className="card" style={{ opacity: item.isActive ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <Link href={`/equipment/${item.id}`} style={{ fontWeight: 600 }}>
                      {item.displayName}
                    </Link>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {catalogNameById.get(item.equipmentCatalogItemId) ?? "Unknown type"}
                      {[item.manufacturer, item.model].some(Boolean)
                        ? ` · ${[item.manufacturer, item.model].filter(Boolean).join(" ")}`
                        : ""}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {EQUIPMENT_STATUS_LABELS[item.status as EquipmentStatus] ?? item.status}
                      {" · "}
                      {EQUIPMENT_CONDITION_LABELS[item.condition as EquipmentCondition] ?? item.condition}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <Link href={`/equipment/${item.id}`} className="button">
                      Open
                    </Link>
                    {canEdit ? (
                      <button type="button" className="button" onClick={() => toggleActive(item)}>
                        {item.isActive ? "Retire" : "Reactivate"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
