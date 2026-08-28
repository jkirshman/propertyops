"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

interface FileRecord {
  id: string;
  fileName: string;
  title: string | null;
  sizeBytes: number;
}

export function AssetDocumentsPanel({ assetId, canManage }: { assetId: string; canManage: boolean }) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/files?relatedEntityType=asset&relatedEntityId=${assetId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("relatedEntityType", "asset");
      formData.append("relatedEntityId", assetId);
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      const response = await fetch("/api/files", { method: "POST", body: formData });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? "Upload failed.");
        return;
      }
      form.reset();
      setTitle("");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canManage ? (
        <form
          onSubmit={handleUpload}
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {error ? <p className="error-text">{error}</p> : null}
          <input
            className="input"
            placeholder="Title (optional) — e.g. Receipt, Warranty"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input type="file" name="file" className="input" />
          <button
            type="submit"
            className="button button-primary"
            disabled={uploading}
            style={{ alignSelf: "flex-start" }}
          >
            {uploading ? "Uploading…" : "Upload document"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : files.length === 0 ? (
        <p className="muted">No documents uploaded yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {files.map((file) => (
            <li key={file.id} className="card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <span>
                {file.title ?? file.fileName}{" "}
                <span className="muted">({Math.round(file.sizeBytes / 1024)} KB)</span>
              </span>
              <a href={`/api/files/${file.id}`} className="button">
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
