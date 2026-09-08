"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  INSPECTION_RESPONSE_TYPES,
  INSPECTION_RESPONSE_TYPE_LABELS,
  type InspectionResponseType,
} from "@/lib/inspections/constants";

interface TemplateRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface TemplateItemRecord {
  id: string;
  label: string;
  description: string | null;
  responseType: string;
  isRequired: boolean;
  allowNote: boolean;
  choices: string[] | null;
  sortOrder: number;
}

const EMPTY_NEW_ITEM = {
  label: "",
  description: "",
  responseType: "pass_fail" as InspectionResponseType,
  isRequired: true,
  allowNote: true,
  choicesText: "",
};

export function InspectionTemplateDetailPanel({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const [items, setItems] = useState<TemplateItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingHeader, setSavingHeader] = useState(false);

  const [newItem, setNewItem] = useState(EMPTY_NEW_ITEM);
  const [addingItem, setAddingItem] = useState(false);

  const load = useCallback(async () => {
    try {
      const [templateRes, itemsRes] = await Promise.all([
        fetch(`/api/inspection-templates/${templateId}`),
        fetch(`/api/inspection-templates/${templateId}/items`),
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
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!nameDraft.trim()) {
      setError("Enter a name.");
      return;
    }
    setSavingHeader(true);
    try {
      const response = await fetch(`/api/inspection-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft, description: descriptionDraft || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not save the template.");
        return;
      }
      setTemplate(data.template);
    } finally {
      setSavingHeader(false);
    }
  }

  async function toggleTemplateActive() {
    if (!template) return;
    const response = await fetch(`/api/inspection-templates/${templateId}`, {
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
    if (!newItem.label.trim()) {
      setError("Enter a checklist item label.");
      return;
    }

    const choices =
      newItem.responseType === "choice"
        ? newItem.choicesText
            .split(",")
            .map((choice) => choice.trim())
            .filter(Boolean)
        : undefined;

    setAddingItem(true);
    try {
      const response = await fetch(`/api/inspection-templates/${templateId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newItem.label,
          description: newItem.description.trim() || undefined,
          responseType: newItem.responseType,
          isRequired: newItem.isRequired,
          allowNote: newItem.allowNote,
          choices,
          sortOrder: items.length,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.choices?.[0] ?? data?.details?.formErrors?.[0] ?? "Could not add the item.");
        return;
      }
      setNewItem(EMPTY_NEW_ITEM);
      await load();
    } finally {
      setAddingItem(false);
    }
  }

  async function updateItem(itemId: string, fields: Record<string, unknown>) {
    await fetch(`/api/inspection-templates/${templateId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    await load();
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/inspection-templates/${templateId}/items/${itemId}`, { method: "DELETE" });
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
            <label className="label" htmlFor="inspection-template-name-edit">
              Name
            </label>
            <input
              id="inspection-template-name-edit"
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
          <label className="label" htmlFor="inspection-template-description-edit">
            Description
          </label>
          <input
            id="inspection-template-description-edit"
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
        <h2 style={{ fontSize: "1rem" }}>Checklist items</h2>

        {items.length === 0 ? (
          <p className="muted">No checklist items yet. Add items below.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {items.map((item) => (
              <li key={item.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.label}</div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {INSPECTION_RESPONSE_TYPE_LABELS[item.responseType as InspectionResponseType] ?? item.responseType}
                      {item.responseType === "choice" && item.choices ? ` (${item.choices.join(", ")})` : ""}
                      {item.description ? ` · ${item.description}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <label className="muted" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <input
                        type="checkbox"
                        checked={item.isRequired}
                        onChange={(event) => updateItem(item.id, { isRequired: event.target.checked })}
                      />
                      Required
                    </label>
                    <label className="muted" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <input
                        type="checkbox"
                        checked={item.allowNote}
                        onChange={(event) => updateItem(item.id, { allowNote: event.target.checked })}
                      />
                      Allow note
                    </label>
                    <button type="button" className="button" onClick={() => removeItem(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <div>
              <label className="label" htmlFor="new-item-label">
                Label / question
              </label>
              <input
                id="new-item-label"
                className="input"
                value={newItem.label}
                onChange={(event) => setNewItem((prev) => ({ ...prev, label: event.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="new-item-response-type">
                Response type
              </label>
              <select
                id="new-item-response-type"
                className="input"
                value={newItem.responseType}
                onChange={(event) =>
                  setNewItem((prev) => ({ ...prev, responseType: event.target.value as InspectionResponseType }))
                }
              >
                {INSPECTION_RESPONSE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {INSPECTION_RESPONSE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem" }}>
              <input
                id="new-item-required"
                type="checkbox"
                checked={newItem.isRequired}
                onChange={(event) => setNewItem((prev) => ({ ...prev, isRequired: event.target.checked }))}
              />
              <label htmlFor="new-item-required">Required</label>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem" }}>
              <input
                id="new-item-allow-note"
                type="checkbox"
                checked={newItem.allowNote}
                onChange={(event) => setNewItem((prev) => ({ ...prev, allowNote: event.target.checked }))}
              />
              <label htmlFor="new-item-allow-note">Allow note</label>
            </div>
          </div>
          {newItem.responseType === "choice" ? (
            <div>
              <label className="label" htmlFor="new-item-choices">
                Choices (comma-separated, at least two)
              </label>
              <input
                id="new-item-choices"
                className="input"
                value={newItem.choicesText}
                onChange={(event) => setNewItem((prev) => ({ ...prev, choicesText: event.target.value }))}
                placeholder="e.g. Good, Fair, Poor"
              />
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="new-item-description">
              Help text (optional)
            </label>
            <input
              id="new-item-description"
              className="input"
              value={newItem.description}
              onChange={(event) => setNewItem((prev) => ({ ...prev, description: event.target.value }))}
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
