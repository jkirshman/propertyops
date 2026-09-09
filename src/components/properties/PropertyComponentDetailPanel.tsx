"use client";

import { useState } from "react";

import { EntityDocumentsPanel } from "@/components/shared/EntityDocumentsPanel";
import { PropertyComponentServiceHistoryPanel } from "@/components/properties/PropertyComponentServiceHistoryPanel";
import { PropertyComponentWorkOrdersPanel } from "@/components/properties/PropertyComponentWorkOrdersPanel";
import { EQUIPMENT_CONDITIONS, EQUIPMENT_CONDITION_LABELS, type EquipmentCondition } from "@/lib/equipment/constants";
import { PROPERTY_COMPONENT_FILES_ENTITY_TYPE } from "@/lib/property-components/constants";

export interface PropertyComponentRecord {
  id: string;
  name: string | null;
  description: string | null;
  installedDate: string | null;
  replacementDate: string | null;
  expectedUsefulLifeYears: number | null;
  warrantyExpiration: string | null;
  vendorId: string | null;
  condition: string;
  notes: string | null;
  isActive: boolean;
}

export function PropertyComponentDetailPanel({
  initialComponent,
  vendorName,
  canEdit,
  canManageService,
  canManageDocuments,
  canCreateWorkOrders,
}: {
  initialComponent: PropertyComponentRecord;
  vendorName: string | null;
  canEdit: boolean;
  canManageService: boolean;
  canManageDocuments: boolean;
  canCreateWorkOrders: boolean;
}) {
  const [component, setComponent] = useState(initialComponent);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function patch(fields: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    const response = await fetch(`/api/property-components/${component.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError("Could not save the change.");
      return;
    }
    setComponent(data.component);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Condition</div>
          <select
            className="input"
            value={component.condition}
            disabled={!canEdit || busy}
            onChange={(event) => patch({ condition: event.target.value })}
          >
            {EQUIPMENT_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {EQUIPMENT_CONDITION_LABELS[value as EquipmentCondition]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Installed</div>
          <div>{component.installedDate ?? "Not set"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Expected replacement</div>
          <div>{component.replacementDate ?? "Not set"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Expected useful life</div>
          <div>{component.expectedUsefulLifeYears ? `${component.expectedUsefulLifeYears} years` : "Not set"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Warranty expiration</div>
          <div>{component.warrantyExpiration ?? "Not set"}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>Vendor</div>
          <div>{vendorName ?? "None"}</div>
        </div>
        {canEdit ? (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" className="button" disabled={busy} onClick={() => patch({ isActive: !component.isActive })}>
              {component.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        ) : null}
      </div>

      {component.description || component.notes ? (
        <div className="card">
          {component.description ? (
            <>
              <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>Description</div>
              <p style={{ whiteSpace: "pre-wrap" }}>{component.description}</p>
            </>
          ) : null}
          {component.notes ? (
            <>
              <div className="muted" style={{ fontSize: "0.8rem", margin: "0.75rem 0 0.3rem" }}>Notes</div>
              <p style={{ whiteSpace: "pre-wrap" }}>{component.notes}</p>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Service history</h2>
        <PropertyComponentServiceHistoryPanel propertyComponentId={component.id} canManage={canManageService} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Work orders</h2>
        <PropertyComponentWorkOrdersPanel propertyComponentId={component.id} canCreate={canCreateWorkOrders} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Documents</h2>
        <EntityDocumentsPanel
          relatedEntityType={PROPERTY_COMPONENT_FILES_ENTITY_TYPE}
          relatedEntityId={component.id}
          canManage={canManageDocuments}
        />
      </div>
    </div>
  );
}
