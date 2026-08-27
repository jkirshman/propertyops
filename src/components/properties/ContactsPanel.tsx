"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { CONTACT_TYPES, CONTACT_TYPE_LABELS, type ContactType } from "@/lib/properties/constants";

interface ContactRecord {
  id: string;
  name: string;
  contactType: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

interface ContactFormState {
  name: string;
  contactType: ContactType;
  company: string;
  email: string;
  phone: string;
  notes: string;
  isPrimary: boolean;
}

const EMPTY_FORM: ContactFormState = {
  name: "",
  contactType: "other",
  company: "",
  email: "",
  phone: "",
  notes: "",
  isPrimary: false,
};

function toFormState(contact: ContactRecord): ContactFormState {
  return {
    name: contact.name,
    contactType: contact.contactType as ContactType,
    company: contact.company ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    notes: contact.notes ?? "",
    isPrimary: contact.isPrimary,
  };
}

export function ContactsPanel({ propertyId, canManage }: { propertyId: string; canManage: boolean }) {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function startEdit(contact: ContactRecord) {
    setEditingId(contact.id);
    setForm(toFormState(contact));
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Enter a name.");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/properties/${propertyId}/contacts/${editingId}`
        : `/api/properties/${propertyId}/contacts`;
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Could not save the contact.");
        return;
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(contact: ContactRecord) {
    await fetch(`/api/properties/${propertyId}/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !contact.isActive }),
    });
    await load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canManage ? (
        <div>
          <button
            type="button"
            className="button"
            onClick={() => (showForm ? setShowForm(false) : startCreate())}
          >
            {showForm ? "Cancel" : "+ Add contact"}
          </button>
          {showForm ? (
            <form
              onSubmit={handleSubmit}
              className="card"
              style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
            >
              {error ? <p className="error-text">{error}</p> : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                <div>
                  <label className="label" htmlFor="contact-name">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    className="input"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="contact-type">
                    Contact type
                  </label>
                  <select
                    id="contact-type"
                    className="input"
                    value={form.contactType}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, contactType: event.target.value as ContactType }))
                    }
                  >
                    {CONTACT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {CONTACT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="contact-company">
                    Company
                  </label>
                  <input
                    id="contact-company"
                    className="input"
                    value={form.company}
                    onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="contact-email">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="contact-phone">
                    Phone
                  </label>
                  <input
                    id="contact-phone"
                    className="input"
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem" }}>
                  <input
                    id="contact-primary"
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={(event) => setForm((prev) => ({ ...prev, isPrimary: event.target.checked }))}
                  />
                  <label htmlFor="contact-primary">Primary contact</label>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="contact-notes">
                  Notes
                </label>
                <textarea
                  id="contact-notes"
                  className="input"
                  rows={2}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
              <button
                type="submit"
                className="button button-primary"
                disabled={submitting}
                style={{ alignSelf: "flex-start" }}
              >
                {submitting ? "Saving…" : editingId ? "Save changes" : "Save contact"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="muted">No contacts on file yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {contacts.map((contact) => (
            <li key={contact.id} className="card" style={{ opacity: contact.isActive ? 1 : 0.55 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {contact.name}
                    {contact.isPrimary ? <span className="muted"> · Primary</span> : null}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {CONTACT_TYPE_LABELS[contact.contactType as ContactType] ?? contact.contactType}
                    {contact.company ? ` · ${contact.company}` : ""}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                  </div>
                  {contact.notes ? (
                    <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                      {contact.notes}
                    </div>
                  ) : null}
                </div>
                {canManage ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <button type="button" className="button" onClick={() => startEdit(contact)}>
                      Edit
                    </button>
                    <button type="button" className="button" onClick={() => toggleActive(contact)}>
                      {contact.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
