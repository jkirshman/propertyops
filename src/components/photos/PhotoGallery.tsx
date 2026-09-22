"use client";

import Link from "next/link";
import { useState } from "react";

import type { PresentedPhoto } from "@/lib/property-photos/photo-rules";

/**
 * PHOTO-1: shared thumbnail grid. With `showContext`, each card names the
 * photo's owning entity (Equipment · Carrier AC #2) and links to it — used
 * by the aggregate Property Photos gallery. Entity Photos sections omit it,
 * since the owner is the page itself. Edit/cover actions appear only where
 * the server said the viewer may use them (canEditCaption / canSetCover).
 */
export function PhotoGallery({
  photos,
  showContext,
  onChanged,
  emptyText = "No photos yet.",
}: {
  photos: PresentedPhoto[];
  showContext: boolean;
  onChanged: () => void | Promise<void>;
  emptyText?: string;
}) {
  if (photos.length === 0) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <ul className="photo-grid">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} showContext={showContext} onChanged={onChanged} />
      ))}
    </ul>
  );
}

function PhotoCard({
  photo,
  showContext,
  onChanged,
}: {
  photo: PresentedPhoto;
  showContext: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(photo.caption ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageUrl = `/api/files/${photo.fileId}?inline=1`;
  const { context } = photo;

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/properties/${photo.propertyId}/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setError("Could not save the change.");
        return false;
      }
      await onChanged();
      return true;
    } catch {
      setError("Could not save the change.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card photo-card">
      <a href={imageUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open photo${photo.caption ? `: ${photo.caption}` : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={photo.caption ?? photo.fileName} loading="lazy" className="photo-thumb" />
      </a>

      <div className="muted" style={{ fontSize: "0.8rem" }}>
        {showContext ? (
          <>
            {context.sourceLabel}
            {context.entityLabel ? (
              <>
                {" · "}
                {context.href ? (
                  <Link href={context.href} className="text-link">{context.entityLabel}</Link>
                ) : (
                  context.entityLabel
                )}
              </>
            ) : null}
            {context.source === "property" && context.sourceLabel !== context.categoryLabel ? ` · ${context.categoryLabel}` : ""}
          </>
        ) : null}
        {photo.isCover ? `${showContext ? " · " : ""}Cover` : ""}
      </div>

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <label className="sr-only" htmlFor={`caption-${photo.id}`}>Caption</label>
          <input
            id={`caption-${photo.id}`}
            className="input"
            value={draft}
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="button button-primary"
              disabled={busy}
              onClick={async () => {
                if (await patch({ caption: draft.trim() === "" ? null : draft.trim() })) setEditing(false);
              }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => {
                setDraft(photo.caption ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : photo.caption ? (
        <div style={{ fontSize: "0.85rem", overflowWrap: "anywhere" }}>&ldquo;{photo.caption}&rdquo;</div>
      ) : null}

      <div className="muted" style={{ fontSize: "0.75rem" }}>
        {new Date(photo.createdAt).toLocaleDateString()}
        {photo.uploadedByName ? ` · ${photo.uploadedByName}` : ""}
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {!editing && (photo.canEditCaption || photo.canSetCover) ? (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {photo.canEditCaption ? (
            <button type="button" className="button photo-card-action" onClick={() => setEditing(true)}>
              {photo.caption ? "Edit caption" : "Add caption"}
            </button>
          ) : null}
          {photo.canSetCover ? (
            <button type="button" className="button photo-card-action" disabled={busy} onClick={() => patch({ isCover: true })}>
              Set as cover
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
