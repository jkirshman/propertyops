"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ARCHIVE_EXPLANATION =
  "Archiving this property removes it from normal operational views but keeps its records and history. You can restore it later.";

/**
 * LIFECYCLE-1: Archive (with a confirmation that lists still-active records)
 * or Restore. Archiving flips only the Property's own lifecycle flag — no
 * Work Order, PM plan, Inspection, Lease, Equipment or file is changed.
 * LIFECYCLE-1A: rendered only from Admin → Properties, which passes
 * `onChanged` to reload its list after a transition.
 */
export function PropertyArchiveControl({
  propertyId,
  isArchived,
  onChanged,
}: {
  propertyId: string;
  isArchived: boolean;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [impactLines, setImpactLines] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openConfirmation() {
    setError(null);
    setConfirming(true);
    setImpactLines(null);
    const response = await fetch(`/api/properties/${propertyId}/archive`).catch(() => null);
    const data = response?.ok ? await response.json().catch(() => null) : null;
    setImpactLines(data?.lines ?? []);
  }

  async function submit(action: "archive" | "restore") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/properties/${propertyId}/${action}`, { method: "POST" });
      if (!response.ok) {
        setError(action === "archive" ? "Could not archive this property." : "Could not restore this property.");
        return;
      }
      setConfirming(false);
      onChanged?.();
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (isArchived) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
        <button type="button" className="button button-primary" onClick={() => submit("restore")} disabled={busy}>
          {busy ? "Restoring…" : "Restore property"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    );
  }

  if (!confirming) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" }}>
        <button type="button" className="button button-danger-quiet" onClick={openConfirmation}>
          Archive property
        </button>
        <p className="muted" style={{ fontSize: "0.8rem" }}>{ARCHIVE_EXPLANATION}</p>
      </div>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby="archive-confirm-title" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <strong id="archive-confirm-title">Archive this property?</strong>
      <p style={{ fontSize: "0.9rem" }}>{ARCHIVE_EXPLANATION}</p>
      {impactLines === null ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>Checking related records…</p>
      ) : impactLines.length > 0 ? (
        <div style={{ fontSize: "0.9rem" }}>
          <div>This property has:</div>
          <ul style={{ margin: "0.25rem 0 0.35rem 1.25rem" }}>
            {impactLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            These records will remain stored but will be hidden from normal active-property workflows. Nothing is
            closed, cancelled or terminated.
          </div>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="button button-danger-quiet"
          onClick={() => submit("archive")}
          disabled={busy || impactLines === null}
        >
          {busy ? "Archiving…" : "Archive property"}
        </button>
        <button type="button" className="button" onClick={() => setConfirming(false)} disabled={busy}>
          Cancel
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
