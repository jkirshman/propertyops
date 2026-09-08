"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

interface TemplateRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  categoryId: string;
  propertyTypeId: string | null;
}

interface OptionRecord {
  id: string;
  name: string;
}

export function InspectionTemplatesPanel() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [categories, setCategories] = useState<OptionRecord[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<OptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [templatesRes, categoriesRes, propertyTypesRes] = await Promise.all([
        fetch("/api/inspection-templates"),
        fetch("/api/inspection-categories?activeOnly=true"),
        fetch("/api/property-types?activeOnly=true"),
      ]);
      if (templatesRes.ok) setTemplates((await templatesRes.json()).templates ?? []);
      if (categoriesRes.ok) setCategories((await categoriesRes.json()).categories ?? []);
      if (propertyTypesRes.ok) setPropertyTypes((await propertyTypesRes.json()).propertyTypes ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    if (!categoryId) {
      setError("Select a category.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/inspection-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          categoryId,
          propertyTypeId: propertyTypeId || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not create the template.");
        return;
      }
      setName("");
      setDescription("");
      setCategoryId("");
      setPropertyTypeId("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(template: TemplateRecord) {
    await fetch(`/api/inspection-templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !template.isActive }),
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
          <div>
            <label className="label" htmlFor="inspection-template-name">
              Name
            </label>
            <input
              id="inspection-template-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Move-In Condition Report"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="inspection-template-category">
              Category
            </label>
            <select
              id="inspection-template-category"
              className="input"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Select a category…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="inspection-template-property-type">
              Applicable property type (optional)
            </label>
            <select
              id="inspection-template-property-type"
              className="input"
              value={propertyTypeId}
              onChange={(event) => setPropertyTypeId(event.target.value)}
            >
              <option value="">Any property type</option>
              {propertyTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="inspection-template-description">
            Description (optional)
          </label>
          <input
            id="inspection-template-description"
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
          {submitting ? "Adding…" : "Add template"}
        </button>
      </form>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="muted">No inspection templates yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {templates.map((template) => (
              <li
                key={template.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
              >
                <Link href={`/admin/inspection-templates/${template.id}`} style={{ opacity: template.isActive ? 1 : 0.55 }}>
                  <div style={{ fontWeight: 600 }}>{template.name}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {categoryNameById.get(template.categoryId) ?? "Unknown category"}
                  </div>
                </Link>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Link href={`/admin/inspection-templates/${template.id}`} className="button">
                    Manage checklist
                  </Link>
                  <button type="button" className="button" onClick={() => toggleActive(template)}>
                    {template.isActive ? "Deactivate" : "Activate"}
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
