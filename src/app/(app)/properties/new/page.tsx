import { PropertyForm } from "@/components/properties/PropertyForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { listPropertyTypes } from "@/lib/properties/property-types";

export default async function NewPropertyPage() {
  const context = await requireCapability(PROPERTY_CAPABILITIES.CREATE, "/properties");
  const propertyTypes = await listPropertyTypes(context.user.organizationId, { activeOnly: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 760 }}>
      <div>
        <h1>Add Property</h1>
        <p className="muted">Create a new property record.</p>
      </div>
      <PropertyForm mode="create" propertyTypes={propertyTypes} />
    </div>
  );
}
