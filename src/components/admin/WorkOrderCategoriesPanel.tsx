"use client";

import { useEffect, useState, type FormEvent } from "react";

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function WorkOrderCategoriesPanel() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/work-order-categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories ?? []);
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
      const response = await fetch("/api/work-order-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          description: description.trim() || undefined,
          sortOrder: categories.length,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not create the category.");
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

  async function toggleActive(category: CategoryRecord) {
    await fetch(`/api/work-order-categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !category.isActive }),
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
          <label className="label" htmlFor="category-name">
            Name
          </label>
          <input
            id="category-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Landscaping"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="category-description">
            Description (optional)
          </label>
          <input
            id="category-description"
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
          {submitting ? "Adding…" : "Add category"}
        </button>
      </form>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="muted">No categories yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {categories.map((category) => (
              <li
                key={category.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}
              >
                <div style={{ opacity: category.isActive ? 1 : 0.55 }}>
                  <div style={{ fontWeight: 600 }}>{category.name}</div>
                  {category.description ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {category.description}
                    </div>
                  ) : null}
                </div>
                <button type="button" className="button" onClick={() => toggleActive(category)}>
                  {category.isActive ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
