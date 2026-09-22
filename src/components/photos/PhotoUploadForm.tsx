"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

import { preparePhotoForUpload } from "@/lib/files/client-image-compression";
import { checkPreparedPhotoSize, describePhotoUploadFailure } from "@/lib/files/image-preparation";

/**
 * PHOTO-1: the one photo upload form, shared by the Property Photos tab and
 * every entity's Photos section. Runs the MOBILE-1 preparation (resize /
 * compress / HEIC→JPEG) automatically on submit, then hands the prepared
 * file to `upload`. `upload` sends it and returns an error message, or null
 * on success.
 *
 * `accept="image/*"` without `capture` lets phones offer both the camera and
 * the photo library.
 */
export function PhotoUploadForm({
  idPrefix,
  upload,
  onUploaded,
  validate,
  extraFields,
  submitLabel = "Add photo",
  intro,
}: {
  idPrefix: string;
  upload: (file: File, caption: string) => Promise<string | null>;
  onUploaded: () => void | Promise<void>;
  /** Extra pre-upload check for caller-owned fields; returns an error message or null. */
  validate?: () => string | null;
  extraFields?: ReactNode;
  submitLabel?: string;
  intro?: ReactNode;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  // "preparing" = client-side resize/compress, "uploading" = network.
  const [stage, setStage] = useState<"idle" | "preparing" | "uploading">("idle");
  // Bumped after a successful upload to reset the (uncontrolled) file input.
  const [fileInputKey, setFileInputKey] = useState(0);
  // Synchronous guard: a fast double-tap can land before the disabled
  // button re-renders.
  const submittingRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a photo to upload.");
      return;
    }
    const validationError = validate?.();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setStage("preparing");
    try {
      const prepared = await preparePhotoForUpload(file);
      if (!prepared.ok) {
        setError(prepared.message);
        return;
      }
      const sizeCheck = checkPreparedPhotoSize({ size: prepared.file.size, wasCompressed: prepared.wasCompressed });
      if (!sizeCheck.ok) {
        setError(sizeCheck.message);
        return;
      }

      setStage("uploading");
      const uploadError = await upload(prepared.file, caption.trim());
      if (uploadError) {
        setError(uploadError);
        return;
      }

      setFile(null);
      setCaption("");
      setFileInputKey((key) => key + 1);
      await onUploaded();
    } catch {
      // Network failure (offline, connection dropped mid-upload).
      setError(describePhotoUploadFailure(0));
    } finally {
      submittingRef.current = false;
      setStage("idle");
    }
  }

  const busy = stage !== "idle";

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      {intro}
      <div className="photo-upload-fields">
        <div>
          <label className="label" htmlFor={`${idPrefix}-file`}>Photo</label>
          <input
            key={fileInputKey}
            id={`${idPrefix}-file`}
            type="file"
            accept="image/*"
            className="input"
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        {extraFields}
        <div>
          <label className="label" htmlFor={`${idPrefix}-caption`}>Caption (optional)</label>
          <input
            id={`${idPrefix}-caption`}
            className="input"
            value={caption}
            maxLength={500}
            disabled={busy}
            onChange={(event) => setCaption(event.target.value)}
          />
        </div>
      </div>
      <button type="submit" className="button button-primary photo-upload-submit" disabled={busy} aria-live="polite">
        {stage === "preparing" ? "Preparing photo…" : stage === "uploading" ? "Uploading…" : submitLabel}
      </button>
    </form>
  );
}

/** Reads a failed photo-upload response into a friendly message (never raw platform text). */
export async function readPhotoUploadError(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);
  return describePhotoUploadFailure(response.status, data?.error);
}
