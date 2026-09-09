"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

interface FileRecord {
  id: string;
  fileName: string;
  title: string | null;
  sizeBytes: number;
  createdAt: string;
}

interface ExternalDocumentLinkRecord {
  id: string;
  displayName: string;
  externalUrl: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

type DocumentRow =
  | { kind: "file"; createdAt: string; file: FileRecord }
  | { kind: "link"; createdAt: string; link: ExternalDocumentLinkRecord };

const emptyLinkForm = { displayName: "", externalUrl: "", category: "", description: "" };

/**
 * Unified Documents tab for any registered `RELATED_ENTITY_FILE_RULES` entity
 * type (POLISH-4) — aggregates PropertyOps-uploaded files and external
 * (e.g. SharePoint) document links into one list, with separate "Upload
 * File" / "Add External Link" forms. Every module's Documents panel should
 * delegate here rather than re-implementing file upload/list on its own.
 */
export function EntityDocumentsPanel({
  relatedEntityType,
  relatedEntityId,
  canManage,
}: {
  relatedEntityType: string;
  relatedEntityId: string;
  canManage: boolean;
}) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [links, setLinks] = useState<ExternalDocumentLinkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [linkForm, setLinkForm] = useState(emptyLinkForm);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [savingLink, setSavingLink] = useState(false);

  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyLinkForm);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [filesResponse, linksResponse] = await Promise.all([
        fetch(`/api/files?relatedEntityType=${relatedEntityType}&relatedEntityId=${relatedEntityId}`),
        fetch(
          `/api/external-documents?relatedEntityType=${relatedEntityType}&relatedEntityId=${relatedEntityId}`,
        ),
      ]);
      if (filesResponse.ok) {
        const data = await filesResponse.json();
        setFiles(data.files ?? []);
      }
      if (linksResponse.ok) {
        const data = await linksResponse.json();
        setLinks(data.externalDocumentLinks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [relatedEntityType, relatedEntityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setUploadError("Choose a file first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("relatedEntityType", relatedEntityType);
      formData.append("relatedEntityId", relatedEntityId);
      if (uploadTitle.trim()) {
        formData.append("title", uploadTitle.trim());
      }
      const response = await fetch("/api/files", { method: "POST", body: formData });
      if (!response.ok) {
        setUploadError("Upload failed. Please try again.");
        return;
      }
      form.reset();
      setUploadTitle("");
      await load();
    } catch {
      setUploadError("Could not reach the server.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLinkError(null);

    if (!linkForm.displayName.trim() || !linkForm.externalUrl.trim()) {
      setLinkError("Enter a name and a link.");
      return;
    }

    setSavingLink(true);
    try {
      const response = await fetch("/api/external-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relatedEntityType,
          relatedEntityId,
          displayName: linkForm.displayName.trim(),
          externalUrl: linkForm.externalUrl.trim(),
          category: linkForm.category.trim() || undefined,
          description: linkForm.description.trim() || undefined,
        }),
      });
      if (!response.ok) {
        setLinkError("Could not add that link. Make sure it's a valid https:// address.");
        return;
      }
      setLinkForm(emptyLinkForm);
      await load();
    } catch {
      setLinkError("Could not reach the server.");
    } finally {
      setSavingLink(false);
    }
  }

  function startEditing(link: ExternalDocumentLinkRecord) {
    setEditingLinkId(link.id);
    setEditError(null);
    setEditForm({
      displayName: link.displayName,
      externalUrl: link.externalUrl,
      category: link.category ?? "",
      description: link.description ?? "",
    });
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLinkId) return;
    setEditError(null);

    if (!editForm.displayName.trim() || !editForm.externalUrl.trim()) {
      setEditError("Enter a name and a link.");
      return;
    }

    try {
      const response = await fetch(`/api/external-documents/${editingLinkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editForm.displayName.trim(),
          externalUrl: editForm.externalUrl.trim(),
          category: editForm.category.trim() || null,
          description: editForm.description.trim() || null,
        }),
      });
      if (!response.ok) {
        setEditError("Could not save changes. Make sure it's a valid https:// address.");
        return;
      }
      setEditingLinkId(null);
      await load();
    } catch {
      setEditError("Could not reach the server.");
    }
  }

  async function toggleLinkActive(link: ExternalDocumentLinkRecord) {
    await fetch(`/api/external-documents/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !link.isActive }),
    });
    await load();
  }

  function openLink(link: ExternalDocumentLinkRecord) {
    // Fire-and-forget audit ping — never blocks or interrupts the navigation
    // the browser is already performing via the anchor's own href/target.
    fetch(`/api/external-documents/${link.id}/open`, { method: "POST" }).catch(() => {});
  }

  const rows: DocumentRow[] = [
    ...files.map((file): DocumentRow => ({ kind: "file", createdAt: file.createdAt, file })),
    ...links.map((link): DocumentRow => ({ kind: "link", createdAt: link.createdAt, link })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {canManage ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <form
            onSubmit={handleUpload}
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: "1 1 260px" }}
          >
            <strong style={{ fontSize: "0.9rem" }}>Upload File</strong>
            {uploadError ? <p className="error-text">{uploadError}</p> : null}
            <input
              className="input"
              placeholder="Title (optional)"
              value={uploadTitle}
              onChange={(event) => setUploadTitle(event.target.value)}
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

          <form
            onSubmit={handleAddLink}
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: "1 1 260px" }}
          >
            <strong style={{ fontSize: "0.9rem" }}>Add External Link</strong>
            {linkError ? <p className="error-text">{linkError}</p> : null}
            <input
              className="input"
              placeholder="Name (e.g. Roof Warranty)"
              value={linkForm.displayName}
              onChange={(event) => setLinkForm((prev) => ({ ...prev, displayName: event.target.value }))}
              aria-invalid={linkError ? true : undefined}
            />
            <input
              className="input"
              placeholder="https://... (e.g. a SharePoint link)"
              value={linkForm.externalUrl}
              onChange={(event) => setLinkForm((prev) => ({ ...prev, externalUrl: event.target.value }))}
              aria-invalid={linkError ? true : undefined}
            />
            <input
              className="input"
              placeholder="Category (optional)"
              value={linkForm.category}
              onChange={(event) => setLinkForm((prev) => ({ ...prev, category: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Description (optional)"
              value={linkForm.description}
              onChange={(event) => setLinkForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <button
              type="submit"
              className="button button-primary"
              disabled={savingLink}
              style={{ alignSelf: "flex-start" }}
            >
              {savingLink ? "Adding…" : "Add link"}
            </button>
          </form>
        </div>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No documents yet.</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {rows.map((row) => {
            if (row.kind === "file") {
              const { file } = row;
              return (
                <li
                  key={`file-${file.id}`}
                  className="card"
                  style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{file.title ?? file.fileName}</div>
                    <div className="muted" style={{ fontSize: "0.8rem" }}>
                      Source: PropertyOps · {Math.round(file.sizeBytes / 1024)} KB · Added{" "}
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <a href={`/api/files/${file.id}`} className="button">
                    Download
                  </a>
                </li>
              );
            }

            const { link } = row;
            if (editingLinkId === link.id) {
              return (
                <li key={`link-${link.id}`} className="card">
                  <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {editError ? <p className="error-text">{editError}</p> : null}
                    <input
                      className="input"
                      value={editForm.displayName}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, displayName: event.target.value }))}
                      placeholder="Name"
                      aria-invalid={editError ? true : undefined}
                    />
                    <input
                      className="input"
                      value={editForm.externalUrl}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, externalUrl: event.target.value }))}
                      placeholder="https://..."
                      aria-invalid={editError ? true : undefined}
                    />
                    <input
                      className="input"
                      value={editForm.category}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))}
                      placeholder="Category (optional)"
                    />
                    <input
                      className="input"
                      value={editForm.description}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Description (optional)"
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="submit" className="button button-primary">
                        Save
                      </button>
                      <button type="button" className="button" onClick={() => setEditingLinkId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </li>
              );
            }

            return (
              <li
                key={`link-${link.id}`}
                className="card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                  opacity: link.isActive ? 1 : 0.55,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {link.displayName}
                    {!link.isActive ? <span className="muted"> (Archived)</span> : null}
                  </div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>
                    Source: External{link.category ? ` · ${link.category}` : ""} · Added{" "}
                    {new Date(link.createdAt).toLocaleDateString()}
                  </div>
                  {link.description ? (
                    <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
                      {link.description}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <a
                    href={link.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button"
                    onClick={() => openLink(link)}
                  >
                    Open Link
                  </a>
                  {canManage ? (
                    <>
                      <button type="button" className="button" onClick={() => startEditing(link)}>
                        Edit
                      </button>
                      <button type="button" className="button" onClick={() => toggleLinkActive(link)}>
                        {link.isActive ? "Archive" : "Reactivate"}
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
