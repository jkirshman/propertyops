import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyProfileTabs } from "@/components/properties/PropertyProfileTabs";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { requireCapability } from "@/lib/auth/require-capability";
import { COMPLIANCE_CAPABILITIES } from "@/lib/compliance/constants";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { parseTab } from "@/lib/properties/property-profile-tabs";
import { getPropertyCompany } from "@/lib/property-companies/property-companies";
import { PROPERTY_COMPONENT_CAPABILITIES } from "@/lib/property-components/constants";
import { getCoverPhoto } from "@/lib/property-photos/property-photos";
import { PROPERTY_UNIT_CAPABILITIES } from "@/lib/property-units/constants";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { getProperty } from "@/lib/properties/properties";
import { getPropertyType } from "@/lib/properties/property-types";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab = parseTab(tab);
  const context = await requireCapability(PROPERTY_CAPABILITIES.VIEW, "/properties");

  const property = await getProperty(context.user.organizationId, id);
  if (!property) {
    notFound();
  }

  const [propertyType, propertyCompany, coverPhoto] = await Promise.all([
    getPropertyType(context.user.organizationId, property.propertyTypeId),
    property.propertyCompanyId
      ? getPropertyCompany(context.user.organizationId, property.propertyCompanyId)
      : Promise.resolve(null),
    getCoverPhoto(context.user.organizationId, property.id),
  ]);
  const canEdit = context.capabilityKeys.includes(PROPERTY_CAPABILITIES.EDIT);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}
      >
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/files/${coverPhoto.fileId}?inline=1`}
            alt=""
            style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8 }}
          />
        ) : null}
        <div style={{ flex: 1 }}>
          <h1 style={{ marginBottom: "0.3rem" }}>{property.name}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {propertyType?.name ?? "Unknown type"}
            {propertyCompany ? ` · ${propertyCompany.name}` : ""}
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
        initialTab={initialTab}
        canManageContacts={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_CONTACTS)}
        canManageNotes={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_NOTES)}
        canManageDocuments={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS)}
        canCreateWorkOrders={context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)}
        canCreateEquipment={context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.CREATE)}
        canEditEquipment={context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.EDIT)}
        canManageEquipmentTemplate={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.EDIT)}
        canAssignAssets={context.capabilityKeys.includes(ASSET_CAPABILITIES.ASSIGN)}
        canCreatePreventiveMaintenance={context.capabilityKeys.includes(PREVENTIVE_MAINTENANCE_CAPABILITIES.CREATE)}
        canManageVendorCoverage={context.capabilityKeys.includes(VENDOR_CAPABILITIES.MANAGE_COVERAGE)}
        canCreateInspections={context.capabilityKeys.includes(INSPECTION_CAPABILITIES.CREATE)}
        canManageCompliance={context.capabilityKeys.includes(COMPLIANCE_CAPABILITIES.EDIT)}
        canCreateLeases={context.capabilityKeys.includes(LEASE_CAPABILITIES.CREATE)}
        supportsUnits={Boolean(propertyType?.supportsUnits)}
        canCreateUnits={context.capabilityKeys.includes(PROPERTY_UNIT_CAPABILITIES.CREATE)}
        canEditUnits={context.capabilityKeys.includes(PROPERTY_UNIT_CAPABILITIES.EDIT)}
        canCreateComponents={context.capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.CREATE)}
        canManagePhotos={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS)}
      />
    </div>
  );
}
