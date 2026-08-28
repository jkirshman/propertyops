"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

interface PersonOption {
  id: string;
  displayName: string;
}

interface PropertyOption {
  id: string;
  name: string;
}

export interface AssetAssignmentSummary {
  assignmentType: string;
  assignedPersonId: string | null;
  assignedPropertyId: string | null;
}

export function AssetAssignmentPanel({
  assetId,
  assignment,
  canAssign,
  onChanged,
}: {
  assetId: string;
  assignment: AssetAssignmentSummary;
  canAssign: boolean;
  onChanged: (asset: AssetAssignmentSummary) => void;
}) {
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [targetType, setTargetType] = useState<"person" | "property" | "unassigned">("unassigned");
  const [personId, setPersonId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!showForm) return;
    fetch("/api/people")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setPeople(data.people ?? []);
      });
    fetch("/api/properties")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setProperties(data.properties ?? []);
      });
  }, [showForm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (targetType === "person" && !personId) {
      setError("Select a person.");
      return;
    }
    if (targetType === "property" && !propertyId) {
      setError("Select a property.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/assets/${assetId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          personId: targetType === "person" ? personId : undefined,
          propertyId: targetType === "property" ? propertyId : undefined,
          notes: notes || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Could not update the assignment.");
        return;
      }
      onChanged(data.asset);
      setShowForm(false);
      setNotes("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Currently held by</div>
          <div style={{ fontWeight: 600 }}>
            {assignment.assignmentType === "person" && assignment.assignedPersonId ? (
              <Link href={`/people/${assignment.assignedPersonId}`}>Person detail</Link>
            ) : assignment.assignmentType === "property" && assignment.assignedPropertyId ? (
              <Link href={`/properties/${assignment.assignedPropertyId}`}>Property detail</Link>
            ) : (
              "Unassigned / back stock"
            )}
          </div>
        </div>
        {canAssign ? (
          <button type="button" className="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? "Cancel" : "Assign / transfer"}
          </button>
        ) : null}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.9rem" }}>
          {error ? <p className="error-text">{error}</p> : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <div>
              <label className="label" htmlFor="assign-target-type">
                Assign to
              </label>
              <select
                id="assign-target-type"
                className="input"
                value={targetType}
                onChange={(event) => setTargetType(event.target.value as typeof targetType)}
              >
                <option value="unassigned">Unassigned / back stock</option>
                <option value="person">Person</option>
                <option value="property">Property</option>
              </select>
            </div>
            {targetType === "person" ? (
              <div>
                <label className="label" htmlFor="assign-person">
                  Person
                </label>
                <select
                  id="assign-person"
                  className="input"
                  value={personId}
                  onChange={(event) => setPersonId(event.target.value)}
                >
                  <option value="">Select a person…</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {targetType === "property" ? (
              <div>
                <label className="label" htmlFor="assign-property">
                  Property
                </label>
                <select
                  id="assign-property"
                  className="input"
                  value={propertyId}
                  onChange={(event) => setPropertyId(event.target.value)}
                >
                  <option value="">Select a property…</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div>
            <label className="label" htmlFor="assign-notes">
              Note (optional)
            </label>
            <input id="assign-notes" className="input" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
            {submitting ? "Saving…" : "Confirm"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
