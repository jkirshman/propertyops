"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { preparePhotoForUpload } from "@/lib/files/client-image-compression";
import { checkPreparedPhotoSize, describePhotoUploadFailure } from "@/lib/files/image-preparation";
import {
  COMPONENT_PHOTO_CATEGORY,
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  type PhotoCategory,
} from "@/lib/property-photos/constants";

interface PhotoRecord {
  id: string;
  fileId: string;
  category: string;
  caption: string | null;
  propertyUnitId: string | null;
  isCover: boolean;
  fileName: string;
  mimeType: string;
}

interface UnitOption {
  id: string;
  unitLabel: string;
}

interface ComponentOption {
  id: string;
  componentType: string;
  name: string | null;
}

export function PropertyPhotosPanel({
  propertyId,
  supportsUnits,
  canManage,
  canUploadComponentPhoto = false,
}: {
  propertyId: string;
  supportsUnits: boolean;
  canManage: boolean;
  canUploadComponentPhoto?: boolean;
}) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<PhotoCategory | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<PhotoCategory>(canManage ? "exterior" : COMPONENT_PHOTO_CATEGORY);
  const [caption, setCaption] = useState("");
  const [unitId, setUnitId] = useState("");
  const [componentId, setComponentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  // "preparing" = client-side resize/compress, "uploading" = network.
  const [uploadStage, setUploadStage] = useState<"idle" | "preparing" | "uploading">("idle");
  // Bumped after a successful upload to reset the (uncontrolled) file input.
  const [fileInputKey, setFileInputKey] = useState(0);
  const uploading = uploadStage !== "idle";
  // Synchronous guard: a fast double-tap can land before the disabled
  // button re-renders.
  const submittingRef = useRef(false);

  const canUpload = canManage || canUploadComponentPhoto;

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/photos`);
      if (response.ok) setPhotos((await response.json()).photos ?? []);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const request = supportsUnits
      ? fetch(`/api/properties/${propertyId}/units?activeOnly=true`).then((response) =>
          response.ok ? response.json() : null,
        )
      : Promise.resolve(null);
    request.then((data) => {
      if (data) setUnits(data.units ?? []);
    });
  }, [propertyId, supportsUnits]);

  useEffect(() => {
    if (!canUploadComponentPhoto) return;
    fetch(`/api/properties/${propertyId}/components?activeOnly=true`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setComponents(data.components ?? []);
      });
  }, [propertyId, canUploadComponentPhoto]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a photo to upload.");
      return;
    }

    if (!canManage && !componentId) {
      setError("Choose which component this photo is for.");
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setUploadStage("preparing");
    try {
      // MOBILE-1: shrink large phone photos before they hit the 4.5MB
      // platform request limit. Both upload paths below send uploadFile.
      const prepared = await preparePhotoForUpload(file);
      if (!prepared.ok) {
        setError(prepared.message);
        return;
      }
      const uploadFile = prepared.file;
      const sizeCheck = checkPreparedPhotoSize({ size: uploadFile.size, wasCompressed: prepared.wasCompressed });
      if (!sizeCheck.ok) {
        setError(sizeCheck.message);
        return;
      }

      setUploadStage("uploading");
      if (!canManage) {
        // A component-photo-only uploader (PROPERTY_COMPONENT_CAPABILITIES.
        // UPLOAD_PHOTO, no property MANAGE_DOCUMENTS) can't use POST
        // /api/files at all — its per-related-entity-type gate requires the
        // full manage-documents capability. This narrower endpoint uploads
        // the Blob and creates the property_photos row itself, in one call.
        const componentFormData = new FormData();
        componentFormData.append("file", uploadFile);
        if (caption) componentFormData.append("caption", caption);

        const componentPhotoResponse = await fetch(`/api/property-components/${componentId}/photos`, {
          method: "POST",
          body: componentFormData,
        });
        const componentPhotoData = await componentPhotoResponse.json().catch(() => null);
        if (!componentPhotoResponse.ok) {
          setError(describePhotoUploadFailure(componentPhotoResponse.status, componentPhotoData?.error));
          return;
        }

        setFile(null);
        setFileInputKey((key) => key + 1);
        setCaption("");
        setComponentId("");
        await load();
        return;
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("relatedEntityType", "property");
      formData.append("relatedEntityId", propertyId);

      const uploadResponse = await fetch("/api/files", { method: "POST", body: formData });
      const uploadData = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok) {
        setError(describePhotoUploadFailure(uploadResponse.status, uploadData?.error));
        return;
      }

      const photoResponse = await fetch(`/api/properties/${propertyId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: uploadData.file.id,
          category,
          caption: caption || undefined,
          propertyUnitId: unitId || undefined,
        }),
      });
      const photoData = await photoResponse.json().catch(() => null);
      if (!photoResponse.ok) {
        setError(photoData?.details?.formErrors?.[0] ?? "Could not save the photo.");
        return;
      }

      setFile(null);
      setFileInputKey((key) => key + 1);
      setCaption("");
      setUnitId("");
      await load();
    } catch {
      // Network failure (offline, connection dropped mid-upload).
      setError(describePhotoUploadFailure(0));
    } finally {
      submittingRef.current = false;
      setUploadStage("idle");
    }
  }

  async function setCover(photoId: string) {
    await fetch(`/api/properties/${propertyId}/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCover: true }),
    });
    await load();
  }

  const visiblePhotos = categoryFilter ? photos.filter((p) => p.category === categoryFilter) : photos;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {canUpload ? (
        <form onSubmit={handleUpload} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {error ? <p className="error-text">{error}</p> : null}
          {!canManage ? <p className="muted" style={{ fontSize: "0.85rem" }}>Upload a photo of a Property Component.</p> : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <div>
              <label className="label" htmlFor="photo-file">Photo</label>
              <input
                key={fileInputKey}
                id="photo-file"
                type="file"
                accept="image/*"
                className="input"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            {canManage ? (
              <div>
                <label className="label" htmlFor="photo-category">Category</label>
                <select
                  id="photo-category"
                  className="input"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as PhotoCategory)}
                >
                  {PHOTO_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {PHOTO_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="photo-component">Component</label>
                <select
                  id="photo-component"
                  className="input"
                  value={componentId}
                  onChange={(event) => setComponentId(event.target.value)}
                  required
                >
                  <option value="">Select a component…</option>
                  {components.map((component) => (
                    <option key={component.id} value={component.id}>
                      {component.name ?? component.componentType}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {canManage && supportsUnits && units.length > 0 ? (
              <div>
                <label className="label" htmlFor="photo-unit">Unit (optional)</label>
                <select id="photo-unit" className="input" value={unitId} onChange={(event) => setUnitId(event.target.value)}>
                  <option value="">None</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unitLabel}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="label" htmlFor="photo-caption">Caption (optional)</label>
              <input id="photo-caption" className="input" value={caption} onChange={(event) => setCaption(event.target.value)} />
            </div>
          </div>
          <button type="submit" className="button button-primary" disabled={uploading} style={{ alignSelf: "flex-start" }}>
            {uploadStage === "preparing" ? "Preparing photo…" : uploadStage === "uploading" ? "Uploading…" : "Upload photo"}
          </button>
        </form>
      ) : null}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="button" onClick={() => setCategoryFilter("")} style={{ fontWeight: categoryFilter === "" ? 700 : 500 }}>
          All
        </button>
        {PHOTO_CATEGORIES.map((value) => (
          <button
            key={value}
            type="button"
            className="button"
            onClick={() => setCategoryFilter(value)}
            style={{ fontWeight: categoryFilter === value ? 700 : 500 }}
          >
            {PHOTO_CATEGORY_LABELS[value]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : visiblePhotos.length === 0 ? (
        <p className="muted">No photos yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.9rem" }}>
          {visiblePhotos.map((photo) => (
            <div key={photo.id} className="card" style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${photo.fileId}?inline=1`}
                alt={photo.caption ?? photo.fileName}
                style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 6 }}
              />
              <div className="muted" style={{ fontSize: "0.8rem" }}>
                {PHOTO_CATEGORY_LABELS[photo.category as PhotoCategory] ?? photo.category}
                {photo.isCover ? " · Cover" : ""}
              </div>
              {photo.caption ? <div style={{ fontSize: "0.85rem" }}>{photo.caption}</div> : null}
              {canManage && !photo.isCover ? (
                <button type="button" className="button" style={{ fontSize: "0.8rem" }} onClick={() => setCover(photo.id)}>
                  Set as cover
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
