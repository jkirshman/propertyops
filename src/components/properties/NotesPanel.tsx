"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

interface NoteRecord {
  id: string;
  body: string;
  authorUserId: string | null;
  createdAt: string;
}

export function NotesPanel({ propertyId, canManage }: { propertyId: string; canManage: boolean }) {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!body.trim()) {
      setError("Enter a note.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not save the note.");
        return;
      }
      setBody("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canManage ? (
        <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {error ? <p className="error-text">{error}</p> : null}
          <textarea
            className="input"
            rows={3}
            placeholder="Add a note…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
            {submitting ? "Saving…" : "Add note"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="muted">No notes yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {notes.map((note) => (
            <li key={note.id} className="card">
              <p style={{ whiteSpace: "pre-wrap" }}>{note.body}</p>
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
