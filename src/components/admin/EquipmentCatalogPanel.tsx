"use client";

import { useEffect, useState, type FormEvent } from "react";

interface CatalogItemRecord {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function EquipmentCatalogPanel() {
  const [items, setItems] = useState<CatalogItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/equipment-catalog");
      if (response.ok) {
        const data = await response.json();
        setItems(data.catalogItems ?? []);
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
      const response = await fetch("/api/equipment-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          category: category.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not create the catalog item.");
        return;
      }
      setName("");
      setCategory("");
      setDescription("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: CatalogItemRecord) {
    await fetch(`/api/equipment-catalog/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <div>
            <label className="label" htmlFor="catalog-name">
              Name
            </label>
            <input
              id="catalog-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Rooftop HVAC Unit"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="catalog-category">
              Category (optional)
            </label>
            <input
              id="catalog-category"
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g. HVAC"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="catalog-description">
            Description (optional)
          </label>
          <input
            id="catalog-description"
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
          {submitting ? "Adding…" : "Add catalog item"}
        </button>
      </form>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted">No equipment catalog items yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {items.map((item) => (
              <li
                key={item.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}
              >
                <div style={{ opacity: item.isActive ? 1 : 0.55 }}>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {[item.category, item.description].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button type="button" className="button" onClick={() => toggleActive(item)}>
                  {item.isActive ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
