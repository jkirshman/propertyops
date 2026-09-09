"use client";

import { useState } from "react";

import { ActivityPanel } from "@/components/properties/ActivityPanel";
import { ContactsPanel } from "@/components/properties/ContactsPanel";
import { DocumentsPanel } from "@/components/properties/DocumentsPanel";
import { EquipmentPanel } from "@/components/properties/EquipmentPanel";
import { NotesPanel } from "@/components/properties/NotesPanel";
import { PropertyAssetsPanel } from "@/components/properties/PropertyAssetsPanel";
import { PropertyCompliancePanel } from "@/components/properties/PropertyCompliancePanel";
import { PropertyInspectionsPanel } from "@/components/properties/PropertyInspectionsPanel";
import { PropertyLeasesPanel } from "@/components/properties/PropertyLeasesPanel";
import { PropertyComponentsPanel } from "@/components/properties/PropertyComponentsPanel";
import { PropertyPhotosPanel } from "@/components/properties/PropertyPhotosPanel";
import { PropertyPreventiveMaintenancePanel } from "@/components/properties/PropertyPreventiveMaintenancePanel";
import { PropertyUnitsPanel } from "@/components/properties/PropertyUnitsPanel";
import { PropertyVendorsPanel } from "@/components/properties/PropertyVendorsPanel";
import { PropertyWorkOrdersPanel } from "@/components/properties/PropertyWorkOrdersPanel";
import { OCCUPANCY_MODEL_LABELS, type OccupancyModel } from "@/lib/properties/constants";
import { TABS, type Tab } from "@/lib/properties/property-profile-tabs";

interface PropertyOverview {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  occupancyModel: string;
  squareFootage: number | null;
  yearBuilt: number | null;
  parcelId: string | null;
  description: string | null;
  operationalNotes: string | null;
  primaryPhone: string | null;
  primaryEmail: string | null;
}

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  equipment: "Equipment",
  assets: "Assets",
  workorders: "Work Orders",
  maintenance: "Preventive Maintenance",
  vendors: "Vendors",
  inspections: "Inspections",
  compliance: "Compliance",
  leases: "Tenants / Leases",
  units: "Units / Suites",
  components: "Components",
  photos: "Photos",
  contacts: "Contacts",
  notes: "Notes",
  documents: "Documents",
  activity: "Activity",
};

function OverviewTab({ property }: { property: PropertyOverview }) {
  const address = [property.addressLine1, property.addressLine2, property.city, property.state, property.postalCode, property.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Address</div>
          <div>{address || "Not set"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Occupancy model</div>
          <div>{OCCUPANCY_MODEL_LABELS[property.occupancyModel as OccupancyModel] ?? property.occupancyModel}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Square footage</div>
          <div>{property.squareFootage ?? "Not set"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Year built</div>
          <div>{property.yearBuilt ?? "Not set"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Parcel / property ID</div>
          <div>{property.parcelId ?? "Not set"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Primary contact</div>
          <div>{[property.primaryPhone, property.primaryEmail].filter(Boolean).join(" · ") || "Not set"}</div>
        </div>
      </div>
      {property.description ? (
        <div className="card">
          <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>Description</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{property.description}</p>
        </div>
      ) : null}
      {property.operationalNotes ? (
        <div className="card">
          <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>Operational notes</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{property.operationalNotes}</p>
        </div>
      ) : null}
    </div>
  );
}

export function PropertyProfileTabs({
  propertyId,
  overview,
  initialTab,
  canManageContacts,
  canManageNotes,
  canManageDocuments,
  canCreateWorkOrders,
  canCreateEquipment,
  canEditEquipment,
  canManageEquipmentTemplate,
  canAssignAssets,
  canCreatePreventiveMaintenance,
  canManageVendorCoverage,
  canCreateInspections,
  canManageCompliance,
  canCreateLeases,
  supportsUnits,
  canCreateUnits,
  canEditUnits,
  canCreateComponents,
  canManagePhotos,
}: {
  propertyId: string;
  overview: PropertyOverview;
  initialTab?: Tab;
  canManageContacts: boolean;
  canManageNotes: boolean;
  canManageDocuments: boolean;
  canCreateWorkOrders: boolean;
  canCreateEquipment: boolean;
  canEditEquipment: boolean;
  canManageEquipmentTemplate: boolean;
  canAssignAssets: boolean;
  canCreatePreventiveMaintenance: boolean;
  canManageVendorCoverage: boolean;
  canCreateInspections: boolean;
  canManageCompliance: boolean;
  canCreateLeases: boolean;
  supportsUnits: boolean;
  canCreateUnits: boolean;
  canEditUnits: boolean;
  canCreateComponents: boolean;
  canManagePhotos: boolean;
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "overview");
  const visibleTabs = TABS.filter((value) => value !== "units" || supportsUnits);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
        {visibleTabs.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            style={{
              padding: "0.6rem 0.9rem",
              background: "none",
              border: "none",
              borderBottom: tab === value ? "2px solid var(--brand)" : "2px solid transparent",
              fontWeight: tab === value ? 600 : 500,
              color: tab === value ? "var(--foreground)" : "var(--muted)",
              cursor: "pointer",
            }}
          >
            {TAB_LABELS[value]}
          </button>
        ))}
      </div>

      {tab === "overview" ? <OverviewTab property={overview} /> : null}
      {tab === "equipment" ? (
        <EquipmentPanel
          propertyId={propertyId}
          canCreate={canCreateEquipment}
          canEdit={canEditEquipment}
          canManageTemplate={canManageEquipmentTemplate}
        />
      ) : null}
      {tab === "assets" ? (
        <PropertyAssetsPanel propertyId={propertyId} canAssign={canAssignAssets} />
      ) : null}
      {tab === "workorders" ? (
        <PropertyWorkOrdersPanel propertyId={propertyId} canCreate={canCreateWorkOrders} />
      ) : null}
      {tab === "maintenance" ? (
        <PropertyPreventiveMaintenancePanel propertyId={propertyId} canCreate={canCreatePreventiveMaintenance} />
      ) : null}
      {tab === "vendors" ? (
        <PropertyVendorsPanel propertyId={propertyId} canManage={canManageVendorCoverage} />
      ) : null}
      {tab === "inspections" ? (
        <PropertyInspectionsPanel propertyId={propertyId} canCreate={canCreateInspections} />
      ) : null}
      {tab === "compliance" ? (
        <PropertyCompliancePanel propertyId={propertyId} canManage={canManageCompliance} />
      ) : null}
      {tab === "leases" ? (
        <PropertyLeasesPanel propertyId={propertyId} canCreate={canCreateLeases} />
      ) : null}
      {tab === "units" && supportsUnits ? (
        <PropertyUnitsPanel propertyId={propertyId} canCreate={canCreateUnits} canEdit={canEditUnits} />
      ) : null}
      {tab === "components" ? (
        <PropertyComponentsPanel propertyId={propertyId} canCreate={canCreateComponents} />
      ) : null}
      {tab === "photos" ? (
        <PropertyPhotosPanel propertyId={propertyId} supportsUnits={supportsUnits} canManage={canManagePhotos} />
      ) : null}
      {tab === "contacts" ? <ContactsPanel propertyId={propertyId} canManage={canManageContacts} /> : null}
      {tab === "notes" ? <NotesPanel propertyId={propertyId} canManage={canManageNotes} /> : null}
      {tab === "documents" ? <DocumentsPanel propertyId={propertyId} canManage={canManageDocuments} /> : null}
      {tab === "activity" ? <ActivityPanel propertyId={propertyId} /> : null}
    </div>
  );
}
