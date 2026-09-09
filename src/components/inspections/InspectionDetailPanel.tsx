"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { utcToZonedInputValue, zonedTimeToUtc } from "@/lib/calendar/timezone";
import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_STATUS_LABELS,
  type InspectionResult,
  type InspectionStatus,
} from "@/lib/inspections/constants";
import { buildWorkOrderDraftFromFinding } from "@/lib/inspections/finding";
import { WORK_ORDER_PRIORITIES, WORK_ORDER_PRIORITY_LABELS } from "@/lib/work-orders/constants";

export interface InspectionRecord {
  id: string;
  propertyId: string;
  propertyEquipmentId: string | null;
  status: string;
  overallResult: string | null;
  summary: string | null;
  scheduledDate: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
}

interface ResponseRecord {
  id: string;
  templateItemId: string | null;
  itemLabel: string;
  itemDescription: string | null;
  itemResponseType: string;
  itemRequired: boolean;
  itemAllowNote: boolean;
  itemChoices: string[] | null;
  value: string | null;
  outcome: "pass" | "fail" | null;
  note: string | null;
}

interface OptionRecord {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  displayName: string;
}

const isFailed = (response: ResponseRecord) => response.itemResponseType === "pass_fail" && response.outcome === "fail";

export function InspectionDetailPanel({
  initialInspection,
  categories,
  users,
  timezone,
  canEdit,
  canComplete,
  canCreateWorkOrder,
  canSchedule,
}: {
  initialInspection: InspectionRecord;
  categories: OptionRecord[];
  users: UserOption[];
  timezone: string;
  canEdit: boolean;
  canComplete: boolean;
  canCreateWorkOrder: boolean;
  canSchedule: boolean;
}) {
  const [inspection, setInspection] = useState(initialInspection);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incompleteLabels, setIncompleteLabels] = useState<string[]>([]);
  const [summaryDraft, setSummaryDraft] = useState(initialInspection.summary ?? "");
  const [busy, setBusy] = useState(false);
  const [findingFormForResponseId, setFindingFormForResponseId] = useState<string | null>(null);
  const [scheduleStartDraft, setScheduleStartDraft] = useState(() =>
    initialInspection.scheduledStartAt ? utcToZonedInputValue(initialInspection.scheduledStartAt, timezone) : "",
  );
  const [scheduleEndDraft, setScheduleEndDraft] = useState(() =>
    initialInspection.scheduledEndAt ? utcToZonedInputValue(initialInspection.scheduledEndAt, timezone) : "",
  );
  const [savingSchedule, setSavingSchedule] = useState(false);

  const readOnly = inspection.status === "completed" || inspection.status === "cancelled";

  useEffect(() => {
    fetch(`/api/inspections/${inspection.id}/responses`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setResponses(data.responses ?? []);
      })
      .finally(() => setLoading(false));
  }, [inspection.id]);

  async function patchResponse(responseId: string, fields: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/inspections/${inspection.id}/responses/${responseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? "Could not save the response.");
      return;
    }
    setResponses((prev) => prev.map((item) => (item.id === responseId ? data.response : item)));
    if (inspection.status === "draft") {
      setInspection((prev) => ({ ...prev, status: "in_progress" }));
    }
  }

  async function handleComplete() {
    setError(null);
    setIncompleteLabels([]);
    setBusy(true);
    try {
      const response = await fetch(`/api/inspections/${inspection.id}/complete`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.error === "incomplete_required_items") {
          setIncompleteLabels(data.incompleteItemLabels ?? []);
          setError("Answer every required item before completing this inspection.");
        } else {
          setError("Could not complete the inspection.");
        }
        return;
      }
      setInspection(data.inspection);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/inspections/${inspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError("Could not cancel the inspection.");
        return;
      }
      setInspection(data.inspection);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSummary() {
    setBusy(true);
    try {
      const response = await fetch(`/api/inspections/${inspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summaryDraft || null }),
      });
      if (response.ok) {
        const data = await response.json();
        setInspection(data.inspection);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSchedule() {
    setBusy(true);
    setSavingSchedule(true);
    try {
      const response = await fetch(`/api/inspections/${inspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledStartAt: scheduleStartDraft ? zonedTimeToUtc(scheduleStartDraft, timezone).toISOString() : null,
          scheduledEndAt: scheduleEndDraft ? zonedTimeToUtc(scheduleEndDraft, timezone).toISOString() : null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setInspection(data.inspection);
      }
    } finally {
      setBusy(false);
      setSavingSchedule(false);
    }
  }

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Status</div>
          <div style={{ fontWeight: 600 }}>{INSPECTION_STATUS_LABELS[inspection.status as InspectionStatus] ?? inspection.status}</div>
        </div>
        {inspection.overallResult ? (
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Result</div>
            <div style={{ fontWeight: 600 }}>
              {INSPECTION_RESULT_LABELS[inspection.overallResult as InspectionResult] ?? inspection.overallResult}
            </div>
          </div>
        ) : null}
        {!readOnly && (canComplete || canEdit) ? (
          <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
            {canEdit ? (
              <button type="button" className="button" onClick={handleCancel} disabled={busy}>
                Cancel inspection
              </button>
            ) : null}
            {canComplete ? (
              <button type="button" className="button button-primary" onClick={handleComplete} disabled={busy}>
                {busy ? "Working…" : "Complete inspection"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {canSchedule && !readOnly ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Scheduled visit</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
            <div>
              <label className="label" htmlFor="insp-scheduled-start">Start</label>
              <input
                id="insp-scheduled-start"
                type="datetime-local"
                className="input"
                value={scheduleStartDraft}
                onChange={(event) => setScheduleStartDraft(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="insp-scheduled-end">End (optional)</label>
              <input
                id="insp-scheduled-end"
                type="datetime-local"
                className="input"
                value={scheduleEndDraft}
                onChange={(event) => setScheduleEndDraft(event.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="button button-primary"
            style={{ alignSelf: "flex-start" }}
            onClick={handleSaveSchedule}
            disabled={savingSchedule}
          >
            {savingSchedule ? "Saving…" : "Save schedule"}
          </button>
        </div>
      ) : null}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Checklist</h2>
        {responses.length === 0 ? (
          <p className="muted">This template has no checklist items.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {responses.map((response) => {
              const failed = isFailed(response);
              const incomplete = incompleteLabels.includes(response.itemLabel);
              return (
                <li
                  key={response.id}
                  className="card"
                  style={{
                    borderColor: failed ? "var(--danger)" : incomplete ? "var(--danger)" : undefined,
                    background: failed ? "var(--danger-bg)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {response.itemLabel}
                        {response.itemRequired ? <span className="muted"> *</span> : null}
                      </div>
                      {response.itemDescription ? (
                        <div className="muted" style={{ fontSize: "0.85rem" }}>{response.itemDescription}</div>
                      ) : null}
                    </div>

                    <ResponseControl
                      response={response}
                      disabled={readOnly}
                      onChange={(fields) => patchResponse(response.id, fields)}
                    />

                    {response.itemAllowNote ? (
                      <textarea
                        className="input"
                        rows={2}
                        placeholder="Note (optional)"
                        defaultValue={response.note ?? ""}
                        disabled={readOnly}
                        onBlur={(event) => {
                          if (event.target.value !== (response.note ?? "")) {
                            patchResponse(response.id, { note: event.target.value || null });
                          }
                        }}
                      />
                    ) : null}

                    {failed && canCreateWorkOrder ? (
                      <div>
                        {findingFormForResponseId === response.id ? (
                          <CreateWorkOrderFromFinding
                            inspectionId={inspection.id}
                            response={response}
                            categories={categories}
                            users={users}
                            onClose={() => setFindingFormForResponseId(null)}
                          />
                        ) : (
                          <button
                            type="button"
                            className="button"
                            onClick={() => setFindingFormForResponseId(response.id)}
                          >
                            Create Work Order from this finding
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Summary</h2>
        <textarea
          className="input"
          rows={3}
          value={summaryDraft}
          disabled={readOnly || !canEdit}
          onChange={(event) => setSummaryDraft(event.target.value)}
        />
        {!readOnly && canEdit ? (
          <button type="button" className="button" onClick={handleSaveSummary} disabled={busy} style={{ alignSelf: "flex-start" }}>
            Save summary
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ResponseControl({
  response,
  disabled,
  onChange,
}: {
  response: ResponseRecord;
  disabled: boolean;
  onChange: (fields: Record<string, unknown>) => void;
}) {
  switch (response.itemResponseType) {
    case "pass_fail":
      return (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="button"
            disabled={disabled}
            style={response.outcome === "pass" ? { background: "var(--success)", color: "#fff", borderColor: "var(--success)" } : undefined}
            onClick={() => onChange({ outcome: "pass" })}
          >
            Pass
          </button>
          <button
            type="button"
            className="button"
            disabled={disabled}
            style={response.outcome === "fail" ? { background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" } : undefined}
            onClick={() => onChange({ outcome: "fail" })}
          >
            Fail
          </button>
        </div>
      );
    case "yes_no":
      return (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="button"
            disabled={disabled}
            style={response.value === "yes" ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : undefined}
            onClick={() => onChange({ value: "yes" })}
          >
            Yes
          </button>
          <button
            type="button"
            className="button"
            disabled={disabled}
            style={response.value === "no" ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : undefined}
            onClick={() => onChange({ value: "no" })}
          >
            No
          </button>
        </div>
      );
    case "choice":
      return (
        <select
          className="input"
          value={response.value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange({ value: event.target.value || null })}
        >
          <option value="">Select…</option>
          {(response.itemChoices ?? []).map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      );
    case "numeric":
      return (
        <input
          type="number"
          className="input"
          defaultValue={response.value ?? ""}
          disabled={disabled}
          onBlur={(event) => {
            if (event.target.value !== (response.value ?? "")) {
              onChange({ value: event.target.value || null });
            }
          }}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className="input"
          defaultValue={response.value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange({ value: event.target.value || null })}
        />
      );
    case "text":
    default:
      return (
        <textarea
          className="input"
          rows={2}
          defaultValue={response.value ?? ""}
          disabled={disabled}
          onBlur={(event) => {
            if (event.target.value !== (response.value ?? "")) {
              onChange({ value: event.target.value || null });
            }
          }}
        />
      );
  }
}

function CreateWorkOrderFromFinding({
  inspectionId,
  response,
  categories,
  users,
  onClose,
}: {
  inspectionId: string;
  response: ResponseRecord;
  categories: OptionRecord[];
  users: UserOption[];
  onClose: () => void;
}) {
  const draft = buildWorkOrderDraftFromFinding({
    propertyId: "",
    propertyEquipmentId: null,
    itemLabel: response.itemLabel,
    note: response.note,
  });
  const [subject, setSubject] = useState(draft.subject);
  const [description, setDescription] = useState(draft.description ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdWorkOrderId, setCreatedWorkOrderId] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!categoryId) {
      setError("Select a category.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await fetch(`/api/inspections/${inspectionId}/responses/${response.id}/convert-to-work-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          description: description || undefined,
          categoryId,
          priority,
          assignedUserId: assignedUserId || undefined,
        }),
      });
      const data = await result.json().catch(() => null);
      if (!result.ok) {
        setError(data?.error ?? "Could not create the work order.");
        return;
      }
      setCreatedWorkOrderId(data.workOrder.id);
    } finally {
      setSubmitting(false);
    }
  }

  if (createdWorkOrderId) {
    return (
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        Work order created:{" "}
        <Link href={`/work-orders/${createdWorkOrderId}`}>Open it</Link>
      </p>
    );
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {error ? <p className="error-text">{error}</p> : null}
      <div>
        <label className="label" htmlFor={`wo-subject-${response.id}`}>Subject</label>
        <input id={`wo-subject-${response.id}`} className="input" value={subject} onChange={(event) => setSubject(event.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor={`wo-description-${response.id}`}>Description</label>
        <textarea
          id={`wo-description-${response.id}`}
          className="input"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.6rem" }}>
        <div>
          <label className="label" htmlFor={`wo-category-${response.id}`}>Category</label>
          <select id={`wo-category-${response.id}`} className="input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Select…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`wo-priority-${response.id}`}>Priority</label>
          <select id={`wo-priority-${response.id}`} className="input" value={priority} onChange={(event) => setPriority(event.target.value)}>
            {WORK_ORDER_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {WORK_ORDER_PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`wo-assignee-${response.id}`}>Assign to (optional)</label>
          <select
            id={`wo-assignee-${response.id}`}
            className="input"
            value={assignedUserId}
            onChange={(event) => setAssignedUserId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" className="button button-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Creating…" : "Create work order"}
        </button>
        <button type="button" className="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
