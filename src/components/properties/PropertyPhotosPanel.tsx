"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PhotoGallery } from "@/components/photos/PhotoGallery";
import { PhotoUploadForm, readPhotoUploadError } from "@/components/photos/PhotoUploadForm";
import {
  GENERAL_PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  type GeneralPhotoCategory,
} from "@/lib/property-photos/constants";
import {
  matchesPhotoGalleryFilter,
  PHOTO_GALLERY_FILTER_LABELS,
  PHOTO_GALLERY_FILTERS,
  type PhotoGalleryFilter,
  type PresentedPhoto,
} from "@/lib/property-photos/photo-rules";

interface UnitOption {
  id: string;
  unitLabel: string;
}

/**
 * PHOTO-1: the Property's aggregate photo gallery — general Property, Unit,
 * Property Component and Equipment photos together, each labeled with and
 * linked to its owner. Uploads here create general Property photos only
 * (optionally Unit-tagged); Equipment and Component photos are added from
 * their own detail pages.
 */
export function PropertyPhotosPanel({
  propertyId,
  supportsUnits,
  canManage,
  canUploadEntityPhotos = false,
}: {
  propertyId: string;
  supportsUnits: boolean;
  canManage: boolean;
  /** Shows the "add these from the Equipment/Component page" hint to upload-only Users. */
  canUploadEntityPhotos?: boolean;
}) {
  const [photos, setPhotos] = useState<PresentedPhoto[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PhotoGalleryFilter>("all");
  const [category, setCategory] = useState<GeneralPhotoCategory>("exterior");
  const [unitId, setUnitId] = useState("");

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
    if (!supportsUnits || !canManage) return;
    fetch(`/api/properties/${propertyId}/units?activeOnly=true`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setUnits(data.units ?? []);
      });
  }, [propertyId, supportsUnits, canManage]);

  // General Property photos: upload the prepared file through the private
  // files foundation, then attach its property_photos row.
  async function upload(file: File, caption: string): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("relatedEntityType", "property");
    formData.append("relatedEntityId", propertyId);

    const uploadResponse = await fetch("/api/files", { method: "POST", body: formData });
    if (!uploadResponse.ok) return readPhotoUploadError(uploadResponse);
    const uploadData = await uploadResponse.json();

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
    if (!photoResponse.ok) {
      const photoData = await photoResponse.json().catch(() => null);
      return photoData?.details?.formErrors?.[0] ?? "Could not save the photo.";
    }
    return null;
  }

  // Only offer filters that match something, so a small portfolio doesn't
  // show a row of empty tabs.
  const availableFilters = useMemo(
    () =>
      PHOTO_GALLERY_FILTERS.filter(
        (value) =>
          value === "all" ||
          photos.some((photo) => matchesPhotoGalleryFilter({ source: photo.context.source, category: photo.category }, value)),
      ),
    [photos],
  );
  const activeFilter = availableFilters.includes(filter) ? filter : "all";
  const visiblePhotos = photos.filter((photo) =>
    matchesPhotoGalleryFilter({ source: photo.context.source, category: photo.category }, activeFilter),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {canManage ? (
        <PhotoUploadForm
          idPrefix="property-photo"
          upload={upload}
          onUploaded={async () => {
            setUnitId("");
            await load();
          }}
          submitLabel="Upload photo"
          intro={
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Add a general Property photo here. To photograph a specific piece of Equipment or a Property
              Component, open it and use its Photos section.
            </p>
          }
          extraFields={
            <>
              <div>
                <label className="label" htmlFor="property-photo-category">Category</label>
                <select
                  id="property-photo-category"
                  className="input"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as GeneralPhotoCategory)}
                >
                  {GENERAL_PHOTO_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {PHOTO_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              {supportsUnits && units.length > 0 ? (
                <div>
                  <label className="label" htmlFor="property-photo-unit">Unit (optional)</label>
                  <select
                    id="property-photo-unit"
                    className="input"
                    value={unitId}
                    onChange={(event) => setUnitId(event.target.value)}
                  >
                    <option value="">None</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unitLabel}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </>
          }
        />
      ) : canUploadEntityPhotos ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          To add a photo, open the Equipment or Property Component it shows and use its Photos section.
        </p>
      ) : null}

      {availableFilters.length > 1 ? (
        <div className="photo-filter-row" role="group" aria-label="Filter photos">
          {availableFilters.map((value) => (
            <button
              key={value}
              type="button"
              className="button"
              aria-pressed={activeFilter === value}
              onClick={() => setFilter(value)}
              style={{ fontWeight: activeFilter === value ? 700 : 500 }}
            >
              {PHOTO_GALLERY_FILTER_LABELS[value]}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <PhotoGallery photos={visiblePhotos} showContext onChanged={load} />
      )}
    </div>
  );
}
