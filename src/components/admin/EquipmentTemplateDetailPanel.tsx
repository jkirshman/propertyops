"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

interface TemplateRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface CatalogItemRecord {
  id: string;
  name: string;
  isActive: boolean;
}

interface TemplateItemRecord {
  id: string;
  equipmentCatalogItemId: string;
  expectedQuantity: number;
  isRequired: boolean;
  notes: string | null;
  sortOrder: number;
}

export function EquipmentTemplateDetailPanel({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const [items, setItems] = useState<TemplateItemRecord[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingHeader, setSavingHeader] = useState(false);

  const [newCatalogItemId, setNewCatalogItemId] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newRequired, setNewRequired] = useState(true);
  const [newNotes, setNewNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const load = useCallback(async () => {
    try {
      const [templateRes, itemsRes, catalogRes] = await Promise.all([
        fetch(`/api/equipment-templates/${templateId}`),
        fetch(`/api/equipment-templates/${templateId}/items`),
        fetch("/api/equipment-catalog?activeOnly=true"),
      ]);

      if (templateRes.ok) {
        const data = await templateRes.json();
        setTemplate(data.template);
        setNameDraft(data.template.name);
        setDescriptionDraft(data.template.description ?? "");
      }
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.items ?? []);
      }
      if (catalogRes.ok) {
        const data = await catalogRes.json();
        setCatalogItems(data.catalogItems ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [templateId]);

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

  const usedCatalogItemIds = useMemo(
    () => new Set(items.map((item) => item.equipmentCatalogItemId)),
    [items],
  );
  const availableCatalogItems = catalogItems.filter((item) => !usedCatalogItemIds.has(item.id));

  async function handleSaveHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!nameDraft.trim()) {
      setError("Enter a name.");
      return;
    }
    setSavingHeader(true);
    try {
      const response = await fetch(`/api/equipment-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft, description: descriptionDraft || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not save the template.");
        return;
      }
      setTemplate(data.template);
    } finally {
      setSavingHeader(false);
    }
  }

  async function toggleTemplateActive() {
    if (!template) return;
    const response = await fetch(`/api/equipment-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !template.isActive }),
    });
    if (response.ok) {
      const data = await response.json();
      setTemplate(data.template);
    }
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!newCatalogItemId) {
      setError("Select an equipment catalog item.");
      return;
    }
    setAddingItem(true);
    try {
      const response = await fetch(`/api/equipment-templates/${templateId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentCatalogItemId: newCatalogItemId,
          expectedQuantity: Number(newQuantity) || 1,
          isRequired: newRequired,
          notes: newNotes.trim() || undefined,
          sortOrder: items.length,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not add the item.");
        return;
      }
      setNewCatalogItemId("");
      setNewQuantity("1");
      setNewRequired(true);
      setNewNotes("");
      await load();
    } finally {
      setAddingItem(false);
    }
  }

  async function updateItem(itemId: string, fields: Record<string, unknown>) {
    await fetch(`/api/equipment-templates/${templateId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    await load();
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/equipment-templates/${templateId}/items/${itemId}`, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  if (!template) {
    return <p className="error-text">Template not found.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <form onSubmit={handleSaveHeader} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="label" htmlFor="template-name-edit">
              Name
            </label>
            <input
              id="template-name-edit"
              className="input"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              required
            />
          </div>
          <button type="button" className="button" onClick={toggleTemplateActive}>
            {template.isActive ? "Deactivate template" : "Activate template"}
          </button>
        </div>
        <div>
          <label className="label" htmlFor="template-description-edit">
            Description
          </label>
          <input
            id="template-description-edit"
            className="input"
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
          />
        </div>
        <button type="submit" className="button button-primary" disabled={savingHeader} style={{ alignSelf: "flex-start" }}>
          {savingHeader ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Template items</h2>

        {items.length === 0 ? (
          <p className="muted">No equipment expected yet. Add items below.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {items.map((item) => (
              <li
                key={item.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {catalogNameById.get(item.equipmentCatalogItemId) ?? "Unknown equipment"}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    Qty {item.expectedQuantity} · {item.isRequired ? "Required" : "Optional"}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <label className="muted" style={{ fontSize: "0.85rem" }}>
                    Qty
                    <input
                      type="number"
                      min={1}
                      className="input"
                      style={{ width: 70, marginLeft: "0.4rem" }}
                      value={item.expectedQuantity}
                      onChange={(event) =>
                        updateItem(item.id, { expectedQuantity: Number(event.target.value) || 1 })
                      }
                    />
                  </label>
                  <label className="muted" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <input
                      type="checkbox"
                      checked={item.isRequired}
                      onChange={(event) => updateItem(item.id, { isRequired: event.target.checked })}
                    />
                    Required
                  </label>
                  <button type="button" className="button" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
            <div>
              <label className="label" htmlFor="new-item-catalog">
                Equipment
              </label>
              <select
                id="new-item-catalog"
                className="input"
                value={newCatalogItemId}
                onChange={(event) => setNewCatalogItemId(event.target.value)}
              >
                <option value="">Select equipment…</option>
                {availableCatalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="new-item-quantity">
                Expected quantity
              </label>
              <input
                id="new-item-quantity"
                type="number"
                min={1}
                className="input"
                value={newQuantity}
                onChange={(event) => setNewQuantity(event.target.value)}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem" }}>
              <input
                id="new-item-required"
                type="checkbox"
                checked={newRequired}
                onChange={(event) => setNewRequired(event.target.checked)}
              />
              <label htmlFor="new-item-required">Required</label>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="new-item-notes">
              Notes (optional)
            </label>
            <input
              id="new-item-notes"
              className="input"
              value={newNotes}
              onChange={(event) => setNewNotes(event.target.value)}
            />
          </div>
          <button type="submit" className="button button-primary" disabled={addingItem} style={{ alignSelf: "flex-start" }}>
            {addingItem ? "Adding…" : "Add item"}
          </button>
        </form>
      </div>
    </div>
  );
}
