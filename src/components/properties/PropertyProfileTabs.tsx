"use client";

import { useState } from "react";

import { ActivityPanel } from "@/components/properties/ActivityPanel";
import { ContactsPanel } from "@/components/properties/ContactsPanel";
import { DocumentsPanel } from "@/components/properties/DocumentsPanel";
import { NotesPanel } from "@/components/properties/NotesPanel";
import { PropertyWorkOrdersPanel } from "@/components/properties/PropertyWorkOrdersPanel";
import { OCCUPANCY_MODEL_LABELS, type OccupancyModel } from "@/lib/properties/constants";

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

const TABS = ["overview", "workorders", "contacts", "notes", "documents", "activity"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  workorders: "Work Orders",
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
  canManageContacts,
  canManageNotes,
  canManageDocuments,
  canCreateWorkOrders,
}: {
  propertyId: string;
  overview: PropertyOverview;
  canManageContacts: boolean;
  canManageNotes: boolean;
  canManageDocuments: boolean;
  canCreateWorkOrders: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((value) => (
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
      {tab === "workorders" ? (
        <PropertyWorkOrdersPanel propertyId={propertyId} canCreate={canCreateWorkOrders} />
      ) : null}
      {tab === "contacts" ? <ContactsPanel propertyId={propertyId} canManage={canManageContacts} /> : null}
      {tab === "notes" ? <NotesPanel propertyId={propertyId} canManage={canManageNotes} /> : null}
      {tab === "documents" ? <DocumentsPanel propertyId={propertyId} canManage={canManageDocuments} /> : null}
      {tab === "activity" ? <ActivityPanel propertyId={propertyId} /> : null}
    </div>
  );
}
