import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyProfileTabs } from "@/components/properties/PropertyProfileTabs";
import { BackLink } from "@/components/shared/BackLink";
import { ASSET_CAPABILITIES } from "@/lib/assets/constants";
import { requireCapability } from "@/lib/auth/require-capability";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { COMPLIANCE_CAPABILITIES } from "@/lib/compliance/constants";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { LEASE_CAPABILITIES } from "@/lib/leases/constants";
import { GLOBAL_BACK_TARGETS } from "@/lib/navigation/back-links";
import { resolveNavVariant } from "@/lib/navigation/nav-visibility";
import { PREVENTIVE_MAINTENANCE_CAPABILITIES } from "@/lib/preventive-maintenance/constants";
import { isPropertyArchived } from "@/lib/properties/archive-rules";
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
import { canUploadEntityPhoto } from "@/lib/property-photos/photo-rules";

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

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  if (!canAccessProperty(scope, property.id)) {
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
  // NAV-1: a User's nav has no Properties list — this page is their "My Property".
  const showBackLink = resolveNavVariant(context.capabilityKeys) !== "user";
  // LIFECYCLE-1: an archived Property stays viewable but is operationally
  // read-only — every "create a new record" entry point is hidden (and the
  // APIs refuse with property_archived). History, photos, documents, notes
  // and contacts stay available; Property details remain editable via Edit.
  const archived = isPropertyArchived(property);
  const operational = !archived;
  const canCreateOperational = (capability: string) => operational && context.capabilityKeys.includes(capability);

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
          <div className="page-title-row">
            {showBackLink ? <BackLink {...GLOBAL_BACK_TARGETS.properties} /> : null}
            <h1 style={{ marginBottom: "0.3rem" }}>
              {property.name}
              {archived ? (
                <>
                  {" "}
                  <span className="lifecycle-tag">Archived</span>
                </>
              ) : null}
            </h1>
          </div>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {propertyType?.name ?? "Unknown type"}
            {propertyCompany ? ` · ${propertyCompany.name}` : ""}
            {property.city ? ` · ${property.city}${property.state ? `, ${property.state}` : ""}` : ""}
          </div>
        </div>
        {canEdit ? (
          <Link href={`/properties/${property.id}/edit`} className="button">
            Edit
          </Link>
        ) : null}
      </div>

      {archived ? (
        // LIFECYCLE-1A: view/history only — archive and restore live in Admin → Properties.
        <div className="card">
          <p style={{ fontSize: "0.9rem" }}>
            This property is archived. It is hidden from normal operational views and no new records can be added to
            it. Its records and history are kept.
          </p>
        </div>
      ) : null}

      <PropertyProfileTabs
        propertyId={property.id}
        overview={property}
        initialTab={initialTab}
        canManageContacts={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_CONTACTS)}
        canManageNotes={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_NOTES)}
        canManageDocuments={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS)}
        canCreateWorkOrders={canCreateOperational(WORK_ORDER_CAPABILITIES.CREATE)}
        canCreateEquipment={canCreateOperational(EQUIPMENT_CAPABILITIES.CREATE)}
        canEditEquipment={context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.EDIT)}
        canManageEquipmentTemplate={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.EDIT)}
        canAssignAssets={context.capabilityKeys.includes(ASSET_CAPABILITIES.ASSIGN)}
        canCreatePreventiveMaintenance={canCreateOperational(PREVENTIVE_MAINTENANCE_CAPABILITIES.CREATE)}
        canManageVendorCoverage={context.capabilityKeys.includes(VENDOR_CAPABILITIES.MANAGE_COVERAGE)}
        canCreateInspections={canCreateOperational(INSPECTION_CAPABILITIES.CREATE)}
        canManageCompliance={canCreateOperational(COMPLIANCE_CAPABILITIES.EDIT)}
        canCreateLeases={canCreateOperational(LEASE_CAPABILITIES.CREATE)}
        supportsUnits={Boolean(propertyType?.supportsUnits)}
        canCreateUnits={canCreateOperational(PROPERTY_UNIT_CAPABILITIES.CREATE)}
        canEditUnits={context.capabilityKeys.includes(PROPERTY_UNIT_CAPABILITIES.EDIT)}
        canCreateComponents={canCreateOperational(PROPERTY_COMPONENT_CAPABILITIES.CREATE)}
        canManagePhotos={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS)}
        canUploadEntityPhotos={
          canUploadEntityPhoto(context.capabilityKeys, "component") ||
          canUploadEntityPhoto(context.capabilityKeys, "equipment")
        }
        canCreateContacts={context.capabilityKeys.includes(PROPERTY_CAPABILITIES.CREATE_CONTACT)}
        currentUserId={context.user.id}
      />

    </div>
  );
}
