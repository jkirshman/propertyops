"use client";

import { useCallback, useEffect, useState } from "react";

interface EmailSendAttemptRow {
  id: string;
  toEmailMasked: string;
  subject: string;
  kind: string;
  status: string;
  failureReason: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  sent: "Sent",
  failed: "Failed",
  skipped_disabled: "Skipped (disabled)",
};

export function EmailSendHistoryPanel() {
  const [attempts, setAttempts] = useState<EmailSendAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (kind.trim()) params.set("kind", kind.trim());

      const response = await fetch(`/api/admin/email/history?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAttempts(data.attempts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [status, kind]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
        <div>
          <label className="label" htmlFor="email-history-status">
            Status
          </label>
          <select
            id="email-history-status"
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="skipped_disabled">Skipped (disabled)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="email-history-kind">
            Type
          </label>
          <input
            id="email-history-kind"
            className="input"
            placeholder="e.g. test, user_invitation"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : attempts.length === 0 ? (
        <p className="muted">No send attempts match this filter.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "0.5rem 0" }}>When</th>
                <th style={{ padding: "0.5rem 0" }}>Type</th>
                <th style={{ padding: "0.5rem 0" }}>To</th>
                <th style={{ padding: "0.5rem 0" }}>Status</th>
                <th style={{ padding: "0.5rem 0" }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem 0", whiteSpace: "nowrap" }}>
                    {new Date(attempt.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.5rem 0" }}>{attempt.kind}</td>
                  <td style={{ padding: "0.5rem 0" }}>{attempt.toEmailMasked}</td>
                  <td style={{ padding: "0.5rem 0" }}>{STATUS_LABELS[attempt.status] ?? attempt.status}</td>
                  <td style={{ padding: "0.5rem 0" }} className="muted">
                    {attempt.failureReason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
