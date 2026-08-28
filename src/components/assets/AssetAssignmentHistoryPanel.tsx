"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface HistoryRecord {
  id: string;
  assignmentType: string;
  personId: string | null;
  propertyId: string | null;
  assignedAt: string;
  notes: string | null;
  returnedAt: string | null;
  returnNotes: string | null;
}

export function AssetAssignmentHistoryPanel({ assetId }: { assetId: string }) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [people, setPeople] = useState<{ id: string; displayName: string }[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assets/${assetId}/assignment-history`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setHistory(data.history ?? []);
      })
      .finally(() => setLoading(false));
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
  }, [assetId]);

  const personNameById = useMemo(() => new Map(people.map((p) => [p.id, p.displayName])), [people]);
  const propertyNameById = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);

  if (loading) {
    return <p className="muted">Loading…</p>;
  }
  if (history.length === 0) {
    return <p className="muted">No assignment history yet.</p>;
  }

  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {history.map((entry) => (
        <li key={entry.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600 }}>
                {entry.assignmentType === "person" && entry.personId ? (
                  <Link href={`/people/${entry.personId}`}>{personNameById.get(entry.personId) ?? "Person"}</Link>
                ) : entry.assignmentType === "property" && entry.propertyId ? (
                  <Link href={`/properties/${entry.propertyId}`}>
                    {propertyNameById.get(entry.propertyId) ?? "Property"}
                  </Link>
                ) : (
                  "Unassigned"
                )}
              </div>
              {entry.notes ? <div className="muted" style={{ fontSize: "0.85rem" }}>{entry.notes}</div> : null}
              {entry.returnNotes ? (
                <div className="muted" style={{ fontSize: "0.85rem" }}>Return note: {entry.returnNotes}</div>
              ) : null}
            </div>
            <div className="muted" style={{ fontSize: "0.8rem", textAlign: "right" }}>
              <div>From {new Date(entry.assignedAt).toLocaleDateString()}</div>
              <div>{entry.returnedAt ? `To ${new Date(entry.returnedAt).toLocaleDateString()}` : "Currently active"}</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
