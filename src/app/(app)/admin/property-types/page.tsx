import { PropertyTypesPanel } from "@/components/admin/PropertyTypesPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { PROPERTY_TYPE_CAPABILITIES } from "@/lib/properties/constants";

export default async function AdminPropertyTypesPage() {
  await requireAdminCapability(PROPERTY_TYPE_CAPABILITIES.MANAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Property Types</h1>
        <p className="muted">
          The property type taxonomy used when creating properties. This will also become the
          foundation for equipment templates in a later phase.
        </p>
      </div>
      <PropertyTypesPanel />
    </div>
  );
}
