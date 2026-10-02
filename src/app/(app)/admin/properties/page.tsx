import { redirect } from "next/navigation";

import { AdminPropertiesPanel } from "@/components/admin/AdminPropertiesPanel";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canArchiveProperty } from "@/lib/properties/archive-rules";

export default async function AdminPropertiesPage() {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    redirect("/login");
  }
  if (!canArchiveProperty(context.capabilityKeys)) {
    redirect("/admin");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Properties</h1>
        <p className="muted">
          Every Property and its lifecycle status. Archived Properties are hidden from normal operational views but
          keep their records and history; restore one to return it to service.
        </p>
      </div>
      <AdminPropertiesPanel />
    </div>
  );
}
