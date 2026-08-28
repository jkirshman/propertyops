"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface PersonRow {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

export function PeopleListPanel({ canCreate }: { canCreate: boolean }) {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "all") params.set("active", statusFilter === "active" ? "true" : "false");

    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/people?${params.toString()}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data) setPeople(data.people ?? []);
        })
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(handle);
  }, [search, statusFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            placeholder="Search people…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="input"
            style={{ maxWidth: 160 }}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
        </div>
        {canCreate ? (
          <Link href="/people/new" className="button button-primary">
            Add Person
          </Link>
        ) : null}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : people.length === 0 ? (
          <p className="muted">
            No people match your filters yet. {canCreate ? <Link href="/people/new">Add the first one.</Link> : null}
          </p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {people.map((person) => (
              <li key={person.id} style={{ opacity: person.isActive ? 1 : 0.6 }}>
                <Link href={`/people/${person.id}`} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 600 }}>{person.displayName}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {[person.email, person.phone].filter(Boolean).join(" · ") || "No contact info"}
                    {!person.isActive ? " · Inactive" : ""}
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
