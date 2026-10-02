"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PropertyArchiveControl } from "@/components/properties/PropertyArchiveControl";
import {
  PROPERTY_LIFECYCLE_FILTER_LABELS,
  PROPERTY_LIFECYCLE_FILTERS,
  PROPERTY_LIFECYCLE_LABELS,
  availableLifecycleAction,
  propertyLifecycleStatus,
  type PropertyLifecycleFilter,
} from "@/lib/properties/lifecycle-views";

interface NamedOption {
  id: string;
  name: string;
}

interface PropertyRow {
  id: string;
  name: string;
  propertyTypeId: string;
  propertyCompanyId: string | null;
  isActive: boolean;
  city: string | null;
  state: string | null;
}

/**
 * LIFECYCLE-1A: Admin → Properties. Lists every Property with its lifecycle
 * status; the name opens the Property detail page, and the Archive / Restore
 * action sits in its own area of the row (no whole-row link), so the two
 * never conflict.
 */
export function AdminPropertiesPanel() {
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<NamedOption[]>([]);
  const [propertyCompanies, setPropertyCompanies] = useState<NamedOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<PropertyLifecycleFilter>("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/property-types")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setPropertyTypes(data?.propertyTypes ?? []));
    fetch("/api/property-companies")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setPropertyCompanies(data?.propertyCompanies ?? []));
  }, []);

  useEffect(() => {
    fetch(`/api/admin/properties?status=${statusFilter}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setProperties(data.properties ?? []);
        setError(null);
      })
      .catch(() => setError("Could not load properties."))
      .finally(() => setLoading(false));
  }, [statusFilter, reloadKey]);

  function changeFilter(next: PropertyLifecycleFilter) {
    setLoading(true);
    setStatusFilter(next);
  }

  function reload() {
    setReloadKey((key) => key + 1);
  }

  const typeNameById = useMemo(() => new Map(propertyTypes.map((type) => [type.id, type.name])), [propertyTypes]);
  const companyNameById = useMemo(
    () => new Map(propertyCompanies.map((company) => [company.id, company.name])),
    [propertyCompanies],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
        <div style={{ minWidth: 160 }}>
          <label className="label" htmlFor="admin-property-status-filter">
            Status
          </label>
          <select
            id="admin-property-status-filter"
            className="input"
            value={statusFilter}
            onChange={(event) => changeFilter(event.target.value as PropertyLifecycleFilter)}
          >
            {PROPERTY_LIFECYCLE_FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {PROPERTY_LIFECYCLE_FILTER_LABELS[filter]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : properties.length === 0 ? (
          <p className="muted">No properties match this filter.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
            {properties.map((property) => {
              const status = propertyLifecycleStatus(property);
              const context = [
                typeNameById.get(property.propertyTypeId) ?? "Unknown type",
                property.propertyCompanyId ? companyNameById.get(property.propertyCompanyId) : null,
                property.city ? `${property.city}${property.state ? `, ${property.state}` : ""}` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={property.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "0.6rem 1rem",
                    padding: "0.75rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                      <Link href={`/properties/${property.id}`} className="entity-link" style={{ overflowWrap: "anywhere" }}>
                        {property.name}
                      </Link>
                      <span className={status === "archived" ? "lifecycle-tag" : "lifecycle-tag lifecycle-tag-active"}>
                        {PROPERTY_LIFECYCLE_LABELS[status]}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.15rem" }}>
                      {context}
                    </div>
                  </div>
                  <div style={{ flex: "0 1 auto", maxWidth: "100%" }}>
                    <PropertyArchiveControl
                      propertyId={property.id}
                      isArchived={availableLifecycleAction(property) === "restore"}
                      onChanged={reload}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
