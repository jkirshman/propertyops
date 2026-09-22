"use client";

import { useCallback, useEffect, useState } from "react";

import { PhotoGallery } from "@/components/photos/PhotoGallery";
import { PhotoUploadForm, readPhotoUploadError } from "@/components/photos/PhotoUploadForm";
import type { PresentedPhoto } from "@/lib/property-photos/photo-rules";

/**
 * PHOTO-1: an entity's own Photos section (Equipment, Property Component).
 * `photosUrl` serves both GET (this entity's photos) and POST (multipart
 * file + caption) — the entity routes own the relationship, so the client
 * never sends an entity id in the body.
 */
export function EntityPhotosPanel({
  idPrefix,
  photosUrl,
  canUpload,
}: {
  idPrefix: string;
  photosUrl: string;
  canUpload: boolean;
}) {
  const [photos, setPhotos] = useState<PresentedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    let ok = false;
    try {
      const response = await fetch(photosUrl);
      if (response.ok) {
        setPhotos((await response.json()).photos ?? []);
        ok = true;
      }
    } finally {
      setLoadError(!ok);
      setLoading(false);
    }
  }, [photosUrl]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File, caption: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (caption) formData.append("caption", caption);
    const response = await fetch(photosUrl, { method: "POST", body: formData });
    return response.ok ? null : readPhotoUploadError(response);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canUpload ? <PhotoUploadForm idPrefix={idPrefix} upload={upload} onUploaded={load} /> : null}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : loadError ? (
        <p className="error-text">Could not load photos.</p>
      ) : (
        <PhotoGallery photos={photos} showContext={false} onChanged={load} />
      )}
    </div>
  );
}
