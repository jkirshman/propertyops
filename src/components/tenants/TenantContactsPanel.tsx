"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

interface ContactRecord {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  notes: string | null;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  isActive: boolean;
}

interface ContactFormState {
  name: string;
  title: string;
  email: string;
  phone: string;
  mobilePhone: string;
  notes: string;
  isPrimary: boolean;
  isEmergencyContact: boolean;
}

const EMPTY_FORM: ContactFormState = {
  name: "",
  title: "",
  email: "",
  phone: "",
  mobilePhone: "",
  notes: "",
  isPrimary: false,
  isEmergencyContact: false,
};

function toFormState(contact: ContactRecord): ContactFormState {
  return {
    name: contact.name,
    title: contact.title ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    mobilePhone: contact.mobilePhone ?? "",
    notes: contact.notes ?? "",
    isPrimary: contact.isPrimary,
    isEmergencyContact: contact.isEmergencyContact,
  };
}

export function TenantContactsPanel({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

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
      const url = editingId ? `/api/tenants/${tenantId}/contacts/${editingId}` : `/api/tenants/${tenantId}/contacts`;
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Could not save the contact.");
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
    await fetch(`/api/tenants/${tenantId}/contacts/${contact.id}`, {
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
          <button type="button" className="button" onClick={() => (showForm ? setShowForm(false) : startCreate())}>
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
                  <label className="label" htmlFor="tenant-contact-name">Name</label>
                  <input
                    id="tenant-contact-name"
                    className="input"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="tenant-contact-title">Role / title</label>
                  <input
                    id="tenant-contact-title"
                    className="input"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="tenant-contact-email">Email</label>
                  <input
                    id="tenant-contact-email"
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="tenant-contact-phone">Phone</label>
                  <input
                    id="tenant-contact-phone"
                    className="input"
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="tenant-contact-mobile">Mobile (optional)</label>
                  <input
                    id="tenant-contact-mobile"
                    className="input"
                    value={form.mobilePhone}
                    onChange={(event) => setForm((prev) => ({ ...prev, mobilePhone: event.target.value }))}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem" }}>
                  <input
                    id="tenant-contact-primary"
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={(event) => setForm((prev) => ({ ...prev, isPrimary: event.target.checked }))}
                  />
                  <label htmlFor="tenant-contact-primary">Primary contact</label>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem" }}>
                  <input
                    id="tenant-contact-emergency"
                    type="checkbox"
                    checked={form.isEmergencyContact}
                    onChange={(event) => setForm((prev) => ({ ...prev, isEmergencyContact: event.target.checked }))}
                  />
                  <label htmlFor="tenant-contact-emergency">Emergency contact</label>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="tenant-contact-notes">Notes</label>
                <textarea
                  id="tenant-contact-notes"
                  className="input"
                  rows={2}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
              <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
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
                    {contact.isEmergencyContact ? <span className="muted"> · Emergency</span> : null}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>{contact.title ?? ""}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {[contact.email, contact.phone, contact.mobilePhone].filter(Boolean).join(" · ")}
                  </div>
                  {contact.notes ? (
                    <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>{contact.notes}</div>
                  ) : null}
                </div>
                {canManage ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <button type="button" className="button" onClick={() => startEdit(contact)}>Edit</button>
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
