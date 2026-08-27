import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyProfileTabs } from "@/components/properties/PropertyProfileTabs";
import { requireCapability } from "@/lib/auth/require-capability";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { getProperty } from "@/lib/properties/properties";
import { getPropertyType } from "@/lib/properties/property-types";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(PROPERTY_CAPABILITIES.VIEW, "/properties");

  const property = await getProperty(context.user.organizationId, id);
  if (!property) {
    notFound();
  }

  const propertyType = await getPropertyType(context.user.organizationId, property.propertyTypeId);
  const canEdit = context.capabilityKeys.includes(PROPERTY_CAPABILITIES.EDIT);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}
      >
        <div>
          <h1 style={{ marginBottom: "0.3rem" }}>{property.name}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {propertyType?.name ?? "Unknown type"}
            {property.city ? ` · ${property.city}${property.state ? `, ${property.state}` : ""}` : ""}
            {!property.isActive ? " · Inactive" : ""}
          </div>
        </div>
        {canEdit ? (
          <Link href={`/properties/${property.id}/edit`} className="button">
            Edit
          </Link>
        ) : null}
      </div>

      <PropertyProfileTabs
        propertyId={property.id}
        overview={property}
        canManageContacts={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_CONTACTS)}
        canManageNotes={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_NOTES)}
        canManageDocuments={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS)}
      />
    </div>
  );
}
