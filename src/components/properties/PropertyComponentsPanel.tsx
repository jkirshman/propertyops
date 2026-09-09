"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { EQUIPMENT_CONDITIONS, EQUIPMENT_CONDITION_LABELS, type EquipmentCondition } from "@/lib/equipment/constants";
import { COMPONENT_TYPES, COMPONENT_TYPE_LABELS, type ComponentType } from "@/lib/property-components/constants";

interface ComponentRecord {
  id: string;
  componentType: string;
  otherTypeLabel: string | null;
  name: string | null;
  condition: string;
  installedDate: string | null;
  replacementDate: string | null;
  vendorId: string | null;
  isActive: boolean;
}

interface VendorOption {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  componentType: "roof" as ComponentType,
  otherTypeLabel: "",
  name: "",
  condition: "unknown" as EquipmentCondition,
  installedDate: "",
  vendorId: "",
};

function typeLabel(component: ComponentRecord): string {
  if (component.componentType === "other" && component.otherTypeLabel) return component.otherTypeLabel;
  return COMPONENT_TYPE_LABELS[component.componentType as ComponentType] ?? component.componentType;
}

export function PropertyComponentsPanel({
  propertyId,
  canCreate,
}: {
  propertyId: string;
  canCreate: boolean;
}) {
  const [components, setComponents] = useState<ComponentRecord[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/components`);
      if (response.ok) setComponents((await response.json()).components ?? []);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/vendors?active=true")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setVendors(data.vendors ?? []));
  }, []);

  const vendorNameById = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.componentType === "other" && !form.otherTypeLabel.trim()) {
      setError("Describe the component type.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentType: form.componentType,
          otherTypeLabel: form.otherTypeLabel || undefined,
          name: form.name || undefined,
          condition: form.condition,
          installedDate: form.installedDate || undefined,
          vendorId: form.vendorId || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not create the component.");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {canCreate ? (
        <div>
          <button type="button" className="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? "Cancel" : "+ Add component"}
          </button>
          {showForm ? (
            <form onSubmit={handleCreate} className="card" style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {error ? <p className="error-text">{error}</p> : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                <div>
                  <label className="label" htmlFor="component-type">Type</label>
                  <select
                    id="component-type"
                    className="input"
                    value={form.componentType}
                    onChange={(event) => setForm((prev) => ({ ...prev, componentType: event.target.value as ComponentType }))}
                  >
                    {COMPONENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {COMPONENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                {form.componentType === "other" ? (
                  <div>
                    <label className="label" htmlFor="component-other-label">Describe type</label>
                    <input
                      id="component-other-label"
                      className="input"
                      value={form.otherTypeLabel}
                      onChange={(event) => setForm((prev) => ({ ...prev, otherTypeLabel: event.target.value }))}
                    />
                  </div>
                ) : null}
                <div>
                  <label className="label" htmlFor="component-name">Name (optional)</label>
                  <input
                    id="component-name"
                    className="input"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="component-condition">Condition</label>
                  <select
                    id="component-condition"
                    className="input"
                    value={form.condition}
                    onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value as EquipmentCondition }))}
                  >
                    {EQUIPMENT_CONDITIONS.map((condition) => (
                      <option key={condition} value={condition}>
                        {EQUIPMENT_CONDITION_LABELS[condition]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="component-installed">Installed date (optional)</label>
                  <input
                    id="component-installed"
                    type="date"
                    className="input"
                    value={form.installedDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, installedDate: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="component-vendor">Vendor (optional)</label>
                  <select
                    id="component-vendor"
                    className="input"
                    value={form.vendorId}
                    onChange={(event) => setForm((prev) => ({ ...prev, vendorId: event.target.value }))}
                  >
                    <option value="">None</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
                {submitting ? "Saving…" : "Save component"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : components.length === 0 ? (
          <p className="muted">No components recorded yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {components.map((component) => (
              <li key={component.id} style={{ opacity: component.isActive ? 1 : 0.6 }}>
                <Link
                  href={`/property-components/${component.id}`}
                  style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {typeLabel(component)}
                      {component.name ? ` — ${component.name}` : ""}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {EQUIPMENT_CONDITION_LABELS[component.condition as EquipmentCondition] ?? component.condition}
                      {component.vendorId ? ` · ${vendorNameById.get(component.vendorId) ?? "Vendor"}` : ""}
                      {!component.isActive ? " · Inactive" : ""}
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {component.installedDate ? `Installed ${component.installedDate}` : ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
