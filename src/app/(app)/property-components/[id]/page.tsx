import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyComponentDetailPanel } from "@/components/properties/PropertyComponentDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { COMPONENT_TYPE_LABELS, PROPERTY_COMPONENT_CAPABILITIES, type ComponentType } from "@/lib/property-components/constants";
import { getPropertyComponent } from "@/lib/property-components/property-components";
import { getProperty } from "@/lib/properties/properties";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";
import { getVendor } from "@/lib/vendors/vendors";

export default async function PropertyComponentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(PROPERTY_COMPONENT_CAPABILITIES.VIEW, "/properties");

  const component = await getPropertyComponent(context.user.organizationId, id);
  if (!component) {
    notFound();
  }

  const [property, vendor] = await Promise.all([
    getProperty(context.user.organizationId, component.propertyId),
    component.vendorId ? getVendor(context.user.organizationId, component.vendorId) : Promise.resolve(null),
  ]);

  const { capabilityKeys } = context;
  const typeLabel =
    component.componentType === "other" && component.otherTypeLabel
      ? component.otherTypeLabel
      : COMPONENT_TYPE_LABELS[component.componentType as ComponentType] ?? component.componentType;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card">
        <div className="muted" style={{ fontSize: "0.85rem" }}>
          {property ? <Link href={`/properties/${property.id}?tab=components`}>{property.name}</Link> : "Unknown property"}
        </div>
        <h1 style={{ marginBottom: "0.3rem" }}>
          {typeLabel}
          {component.name ? ` — ${component.name}` : ""}
        </h1>
      </div>

      <PropertyComponentDetailPanel
        initialComponent={{
          id: component.id,
          name: component.name,
          description: component.description,
          installedDate: component.installedDate,
          replacementDate: component.replacementDate,
          expectedUsefulLifeYears: component.expectedUsefulLifeYears,
          warrantyExpiration: component.warrantyExpiration,
          vendorId: component.vendorId,
          condition: component.condition,
          notes: component.notes,
          isActive: component.isActive,
        }}
        vendorName={vendor?.name ?? null}
        canEdit={capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.EDIT)}
        canManageService={capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.MANAGE_SERVICE)}
        canManageDocuments={capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.MANAGE_DOCUMENTS)}
        canCreateWorkOrders={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)}
      />
    </div>
  );
}
