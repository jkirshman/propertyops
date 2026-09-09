import { PropertyCompaniesPanel } from "@/components/admin/PropertyCompaniesPanel";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";
import { PROPERTY_COMPANY_CAPABILITIES } from "@/lib/property-companies/constants";

export default async function AdminPropertyCompaniesPage() {
  await requireAdminCapability(PROPERTY_COMPANY_CAPABILITIES.MANAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Property Companies</h1>
        <p className="muted">
          The ownership-entity taxonomy selectable on each Property&apos;s Identity section.
        </p>
      </div>
      <PropertyCompaniesPanel />
    </div>
  );
}
