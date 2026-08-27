import { notFound } from "next/navigation";

import { PropertyForm, type PropertyFormValues } from "@/components/properties/PropertyForm";
import { requireCapability } from "@/lib/auth/require-capability";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { getProperty } from "@/lib/properties/properties";
import { listPropertyTypes } from "@/lib/properties/property-types";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(PROPERTY_CAPABILITIES.EDIT, `/properties/${id}`);

  const [property, propertyTypes] = await Promise.all([
    getProperty(context.user.organizationId, id),
    listPropertyTypes(context.user.organizationId, { activeOnly: true }),
  ]);

  if (!property) {
    notFound();
  }

  const initialValues: Partial<PropertyFormValues> = {
    propertyTypeId: property.propertyTypeId,
    name: property.name,
    propertyCode: property.propertyCode ?? "",
    occupancyModel: property.occupancyModel,
    addressLine1: property.addressLine1 ?? "",
    addressLine2: property.addressLine2 ?? "",
    city: property.city ?? "",
    state: property.state ?? "",
    postalCode: property.postalCode ?? "",
    country: property.country ?? "",
    squareFootage: property.squareFootage?.toString() ?? "",
    yearBuilt: property.yearBuilt?.toString() ?? "",
    parcelId: property.parcelId ?? "",
    description: property.description ?? "",
    operationalNotes: property.operationalNotes ?? "",
    primaryPhone: property.primaryPhone ?? "",
    primaryEmail: property.primaryEmail ?? "",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 760 }}>
      <div>
        <h1>Edit {property.name}</h1>
      </div>
      <PropertyForm
        mode="edit"
        propertyId={property.id}
        propertyTypes={propertyTypes}
        initialValues={initialValues}
      />
    </div>
  );
}
