"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

interface TemplateRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export function EquipmentTemplatesPanel() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/equipment-templates");
      if (response.ok) {
        const data = await response.json();
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

    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/equipment-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not create the template.");
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

  async function toggleActive(template: TemplateRecord) {
    await fetch(`/api/equipment-templates/${template.id}`, {
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
        <div>
          <label className="label" htmlFor="template-name">
            Name
          </label>
          <input
            id="template-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Residential Rental — Standard"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="template-description">
            Description (optional)
          </label>
          <input
            id="template-description"
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
          <p className="muted">No equipment templates yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {templates.map((template) => (
              <li
                key={template.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}
              >
                <Link href={`/admin/equipment-templates/${template.id}`} style={{ opacity: template.isActive ? 1 : 0.55 }}>
                  <div style={{ fontWeight: 600 }}>{template.name}</div>
                  {template.description ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {template.description}
                    </div>
                  ) : null}
                </Link>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Link href={`/admin/equipment-templates/${template.id}`} className="button">
                    Manage items
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
