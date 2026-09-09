"use client";

import { useEffect, useState, type FormEvent } from "react";

interface PropertyCompanyRecord {
  id: string;
  name: string;
  legalName: string | null;
  notes: string | null;
  isActive: boolean;
}

export function PropertyCompaniesPanel() {
  const [companies, setCompanies] = useState<PropertyCompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/property-companies");
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.propertyCompanies ?? []);
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
      const response = await fetch("/api/property-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), legalName: legalName.trim() || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.details?.formErrors?.[0] ?? "Could not create the property company.");
        return;
      }
      setName("");
      setLegalName("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(company: PropertyCompanyRecord) {
    await fetch(`/api/property-companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !company.isActive }),
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
          <label className="label" htmlFor="company-name">
            Name
          </label>
          <input
            id="company-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. LAW Asset Group"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="company-legal-name">
            Legal name (optional)
          </label>
          <input
            id="company-legal-name"
            className="input"
            value={legalName}
            onChange={(event) => setLegalName(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className="button button-primary"
          disabled={submitting}
          style={{ alignSelf: "flex-start" }}
        >
          {submitting ? "Adding…" : "Add property company"}
        </button>
      </form>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : companies.length === 0 ? (
          <p className="muted">No property companies yet.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {companies.map((company) => (
              <li
                key={company.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
              >
                <div style={{ opacity: company.isActive ? 1 : 0.55 }}>
                  <div style={{ fontWeight: 600 }}>{company.name}</div>
                  {company.legalName ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {company.legalName}
                    </div>
                  ) : null}
                </div>
                <button type="button" className="button" onClick={() => toggleActive(company)}>
                  {company.isActive ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
