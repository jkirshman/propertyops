"use client";

import { useEffect, useState, type FormEvent } from "react";

interface PropertyTypeRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  defaultEquipmentTemplateId: string | null;
}

interface TemplateOption {
  id: string;
  name: string;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PropertyTypesPanel() {
  const [types, setTypes] = useState<PropertyTypeRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [typesRes, templatesRes] = await Promise.all([
        fetch("/api/property-types"),
        fetch("/api/equipment-templates?activeOnly=true"),
      ]);
      if (typesRes.ok) {
        const data = await typesRes.json();
        setTypes(data.propertyTypes ?? []);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const slug = slugify(name);
    if (!slug) {
      setError("Enter a name.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/property-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          description: description.trim() || undefined,
          sortOrder: types.length,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not create the property type.");
        return;
      }
      setName("");
      setDescription("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(type: PropertyTypeRecord) {
    await fetch(`/api/property-types/${type.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !type.isActive }),
    });
    await load();
  }

  async function setDefaultTemplate(type: PropertyTypeRecord, templateId: string) {
    await fetch(`/api/property-types/${type.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultEquipmentTemplateId: templateId || null }),
    });
    await load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <form
        onSubmit={handleCreate}
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        {error ? <p className="error-text">{error}</p> : null}
        <div>
          <label className="label" htmlFor="type-name">
            Name
          </label>
          <input
            id="type-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Industrial Warehouse"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="type-description">
            Description (optional)
          </label>
          <input
            id="type-description"
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className="button button-primary"
          disabled={submitting}
          style={{ alignSelf: "flex-start" }}
        >
          {submitting ? "Adding…" : "Add property type"}
        </button>
      </form>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : types.length === 0 ? (
          <p className="muted">No property types yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {types.map((type) => (
              <li
                key={type.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
              >
                <div style={{ opacity: type.isActive ? 1 : 0.55 }}>
                  <div style={{ fontWeight: 600 }}>{type.name}</div>
                  {type.description ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {type.description}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <label className="muted" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    Default equipment template
                    <select
                      className="input"
                      style={{ minWidth: 180 }}
                      value={type.defaultEquipmentTemplateId ?? ""}
                      onChange={(event) => setDefaultTemplate(type, event.target.value)}
                    >
                      <option value="">None</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="button" onClick={() => toggleActive(type)}>
                    {type.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
