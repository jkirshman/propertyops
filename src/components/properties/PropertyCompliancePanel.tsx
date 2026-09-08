"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  COMPLIANCE_CATEGORIES,
  COMPLIANCE_CATEGORY_LABELS,
  type ComplianceCategory,
} from "@/lib/compliance/constants";
import { classifyComplianceRecordStatus, COMPLIANCE_STATUS_LABELS, type ComplianceStatus } from "@/lib/compliance/status";
import { VALIDATION_BANNER_MESSAGE, invalidFieldProps, mapFieldErrors } from "@/lib/forms/field-errors";
import { createComplianceRecordSchema } from "@/lib/validation/compliance";

import { ComplianceDocumentsPanel } from "@/components/compliance/ComplianceDocumentsPanel";

interface ComplianceRecord {
  id: string;
  category: string;
  name: string;
  issuer: string | null;
  issuedDate: string | null;
  expirationDate: string | null;
  isActive: boolean;
  notes: string | null;
}

interface FormState {
  category: ComplianceCategory;
  name: string;
  issuer: string;
  issuedDate: string;
  expirationDate: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  category: "certificate",
  name: "",
  issuer: "",
  issuedDate: "",
  expirationDate: "",
  notes: "",
};

const STATUS_BADGE_STYLE: Record<ComplianceStatus, { background: string; color: string }> = {
  current: { background: "#dcfce7", color: "#166534" },
  expiring_soon: { background: "#fef3c7", color: "#92400e" },
  expired: { background: "#fee2e2", color: "#991b1b" },
  no_expiration: { background: "var(--background)", color: "var(--muted)" },
};

function StatusBadge({ expirationDate }: { expirationDate: string | null }) {
  const status = classifyComplianceRecordStatus(expirationDate);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        ...STATUS_BADGE_STYLE[status],
      }}
    >
      {COMPLIANCE_STATUS_LABELS[status]}
    </span>
  );
}

export function PropertyCompliancePanel({ propertyId, canManage }: { propertyId: string; canManage: boolean }) {
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedDocsId, setExpandedDocsId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ propertyId });
      if (!showInactive) params.set("active", "true");
      const response = await fetch(`/api/compliance-records?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId, showInactive]);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFieldErrors({});
    setShowForm(true);
  }

  function startEdit(record: ComplianceRecord) {
    setEditingId(record.id);
    setForm({
      category: record.category as ComplianceCategory,
      name: record.name,
      issuer: record.issuer ?? "",
      issuedDate: record.issuedDate ?? "",
      expirationDate: record.expirationDate ?? "",
      notes: record.notes ?? "",
    });
    setError(null);
    setFieldErrors({});
    setShowForm(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      propertyId,
      category: form.category,
      name: form.name,
      issuer: form.issuer || undefined,
      issuedDate: form.issuedDate || undefined,
      expirationDate: form.expirationDate || undefined,
      notes: form.notes || undefined,
    };

    if (!editingId) {
      const localResult = createComplianceRecordSchema.safeParse(payload);
      if (!localResult.success) {
        setFieldErrors(mapFieldErrors(localResult.error.flatten().fieldErrors));
        setError(VALIDATION_BANNER_MESSAGE);
        return;
      }
    }

    setSubmitting(true);
    try {
      const url = editingId ? `/api/compliance-records/${editingId}` : "/api/compliance-records";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...payload, propertyId: undefined } : payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const serverFieldErrors = data?.details?.fieldErrors as Record<string, string[] | undefined> | undefined;
        if (serverFieldErrors && Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(mapFieldErrors(serverFieldErrors));
          setError(VALIDATION_BANNER_MESSAGE);
        } else {
          setError("Could not save the compliance record.");
        }
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

  async function toggleActive(record: ComplianceRecord) {
    await fetch(`/api/compliance-records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !record.isActive }),
    });
    await load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <label className="muted" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
          Show inactive records
        </label>
        {canManage ? (
          <button type="button" className="button" onClick={() => (showForm ? setShowForm(false) : startCreate())}>
            {showForm ? "Cancel" : "+ Add compliance record"}
          </button>
        ) : null}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {error ? <p className="error-text">{error}</p> : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <div>
              <label className="label" htmlFor="compliance-category">Category</label>
              <select
                id="compliance-category"
                className="input"
                value={form.category}
                onChange={(event) => update("category", event.target.value as ComplianceCategory)}
                {...invalidFieldProps(Boolean(fieldErrors.category))}
              >
                {COMPLIANCE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {COMPLIANCE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="compliance-name">Name</label>
              <input
                id="compliance-name"
                className="input"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                {...invalidFieldProps(Boolean(fieldErrors.name))}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="compliance-issuer">Issuer (optional)</label>
              <input
                id="compliance-issuer"
                className="input"
                value={form.issuer}
                onChange={(event) => update("issuer", event.target.value)}
                {...invalidFieldProps(Boolean(fieldErrors.issuer))}
              />
            </div>
            <div>
              <label className="label" htmlFor="compliance-issued-date">Issued date (optional)</label>
              <input
                id="compliance-issued-date"
                type="date"
                className="input"
                value={form.issuedDate}
                onChange={(event) => update("issuedDate", event.target.value)}
                {...invalidFieldProps(Boolean(fieldErrors.issuedDate))}
              />
            </div>
            <div>
              <label className="label" htmlFor="compliance-expiration-date">Expiration date (optional)</label>
              <input
                id="compliance-expiration-date"
                type="date"
                className="input"
                value={form.expirationDate}
                onChange={(event) => update("expirationDate", event.target.value)}
                {...invalidFieldProps(Boolean(fieldErrors.expirationDate))}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="compliance-notes">Notes (optional)</label>
            <textarea
              id="compliance-notes"
              className="input"
              rows={2}
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </div>
          <button type="submit" className="button button-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
            {submitting ? "Saving…" : editingId ? "Save changes" : "Add record"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : records.length === 0 ? (
        <p className="muted">No compliance records on file yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {records.map((record) => (
            <li key={record.id} className="card" style={{ opacity: record.isActive ? 1 : 0.55 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{record.name}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {COMPLIANCE_CATEGORY_LABELS[record.category as ComplianceCategory] ?? record.category}
                    {record.issuer ? ` · ${record.issuer}` : ""}
                    {record.expirationDate ? ` · Expires ${record.expirationDate}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <StatusBadge expirationDate={record.expirationDate} />
                  {canManage ? (
                    <>
                      <button type="button" className="button" onClick={() => startEdit(record)}>
                        Edit
                      </button>
                      <button type="button" className="button" onClick={() => toggleActive(record)}>
                        {record.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="button"
                    onClick={() => setExpandedDocsId((current) => (current === record.id ? null : record.id))}
                  >
                    {expandedDocsId === record.id ? "Hide documents" : "Documents"}
                  </button>
                </div>
              </div>
              {expandedDocsId === record.id ? (
                <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                  <ComplianceDocumentsPanel complianceRecordId={record.id} canManage={canManage} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
