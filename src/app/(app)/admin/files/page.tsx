import { FilesAdminPanel } from "@/components/files/FilesAdminPanel";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { isFileStorageConfigured } from "@/lib/files/files";

export default async function AdminFilesPage() {
  await requireAdminCapability(ADMIN_CAPABILITIES.FILES);
  const configured = isFileStorageConfigured();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Files / Documents</h1>
        <p className="muted">
          Generic private file storage, reusable by future Property, Work Order, Equipment, and
          Asset modules.
        </p>
      </div>
      {!configured ? (
        <p className="error-text">
          Blob storage is not configured yet (BLOB_READ_WRITE_TOKEN is unset).
        </p>
      ) : (
        <FilesAdminPanel />
      )}
    </div>
  );
}
